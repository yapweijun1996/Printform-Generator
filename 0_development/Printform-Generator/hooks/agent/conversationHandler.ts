import { Sender } from '../../types';
import type { ConversationHandlerDependencies } from './conversationTypes';
import { extractToolCallFromText } from './textToolCall';
import { handleToolCallFlow } from './toolCallFlow';
import { buildAutoGroundingContext } from './autoGrounding';
import { debugLog } from '../../utils/debug';

const normalizeLoopKey = (s: string) =>
  String(s || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 220);

const looksLikeToolNarrationWithoutCall = (s: string) => {
  const t = normalizeLoopKey(s).toLowerCase();
  return (
    /wait,?\s*i('|’)ll\s+(use|just)\s+`?(read_file|read_all_files|grep_search|modify_code|insert_content|manage_plan|diff_check|undo_last)/i.test(
      t,
    ) ||
    /i('|’)ll\s+use\s+`?read_file/i.test(t) ||
    /i('|’)ll\s+just\s+rewrite/i.test(t)
  );
};

export const processConversationTurn = async (
  inputPayload: string | any[],
  image: { mimeType: string; data: string } | undefined,
  recursionDepth: number,
  deps: ConversationHandlerDependencies,
): Promise<void> => {
  const {
    geminiServiceRef,
    getActiveFile,
    activeTools,
    tasksRef,
    referenceImageRef,
    previewImageRef,
    requestPreviewSnapshot,
    getPreviewSnapshotVersion,
    waitForNextPreviewSnapshot,
    setMessages,
    setIsLoading,
    setBotStatus,
    autoLoopGuardRef,
  } = deps;

  if (recursionDepth > 100) {
    setBotStatus(undefined);
    const continueMessageId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      {
        id: continueMessageId,
        sender: Sender.Bot,
        text: '⚠️ Reached safety limit (100 automatic turns). Click Continue to keep going.',
        timestamp: Date.now(),
        action: {
          type: 'continue_execution' as const,
          label: 'Continue',
          onAction: async () => {
            setMessages((prev) => prev.map((m) => (m.id === continueMessageId ? { ...m, action: undefined } : m)));
            await processConversationTurn('Continue with the next pending task in the plan.', undefined, 0, deps);
          },
        },
      },
    ]);
    setIsLoading(false);
    return;
  }

  // Reset loop guard on new user turn.
  if (recursionDepth === 0) {
    autoLoopGuardRef.current.noToolStreak = 0;
    autoLoopGuardRef.current.lastNoToolResponseKey = '';
  }

  const service = geminiServiceRef.current;
  if (!service) throw new Error('Gemini service not initialized');

  // Preflight: refresh preview snapshot before asking the model to amend code (best-effort).
  if (recursionDepth === 0) {
    const beforeVersion = getPreviewSnapshotVersion();
    const allowHighRes =
      (activeTools || []).includes('visual_review') || (activeTools || []).includes('image_analysis');
    // Keep preflight payload small; request higher-res via the visual_review tool when needed.
    requestPreviewSnapshot(allowHighRes ? { scale: 0.8, jpegQuality: 0.6 } : undefined);
    const ok = await waitForNextPreviewSnapshot(1500, beforeVersion);
    const hasAnySnapshot = Boolean(previewImageRef.current);

    setMessages((prev) => [
      ...prev,
      {
        id: `preflight-${Date.now()}`,
        sender: Sender.Bot,
        text: ok
          ? 'Preflight：已刷新到最新 Preview 快照（将用于本轮改动决策）。'
          : hasAnySnapshot
            ? 'Preflight：Preview 快照刷新超时（将继续使用上一次快照）。'
            : 'Preflight：未获取到 Preview 快照（将仅依据当前代码与任务上下文继续）。',
        timestamp: Date.now(),
        collapsible: {
          title: 'Preflight Audit（点击展开）',
          content: `snapshotRefreshed=${ok}\npreviousVersion=${beforeVersion}\ncurrentVersion=${getPreviewSnapshotVersion()}\ntimeoutMs=1500`,
          defaultOpen: false,
        },
      },
    ]);
  }

  const botMessageId = (Date.now() + 1).toString();
  if (recursionDepth === 0) {
    setMessages((prev) => [
      ...prev,
      {
        id: botMessageId,
        sender: Sender.Bot,
        text: '',
        timestamp: Date.now(),
        isStreaming: true,
        statusText: 'Thinking...',
      },
    ]);
  } else {
    setBotStatus('Processing result...');
  }

  const activeFile = getActiveFile();
  const effectiveReferenceImage = image || referenceImageRef.current;
  const effectivePreviewImage = previewImageRef.current;
  const images = {
    reference: effectiveReferenceImage,
    preview: effectivePreviewImage,
  } as {
    reference?: { mimeType: string; data: string };
    preview?: { mimeType: string; data: string };
  };

  let enrichedPayload: string | any[] = inputPayload;
  if (typeof inputPayload === 'string') {
    const autoGrounding = await buildAutoGroundingContext({
      userMessage: inputPayload,
      deps,
      recursionDepth,
      hasReferenceImage: Boolean(effectiveReferenceImage),
    });
    enrichedPayload = `${autoGrounding}\n\n[USER REQUEST]\n${inputPayload}`;
    debugLog('conversation.turn.start', {
      recursionDepth,
      activeTools,
      hasReferenceImage: Boolean(effectiveReferenceImage),
      hasPreviewImage: Boolean(effectivePreviewImage),
      activeFileName: activeFile?.name,
      activeFileChars: (activeFile?.content || '').length,
      autoGroundingChars: autoGrounding.length,
      autoGroundingPreview: autoGrounding.slice(0, 400),
    });
  } else {
    debugLog('conversation.turn.toolResponse', {
      recursionDepth,
      activeTools,
      hasReferenceImage: Boolean(effectiveReferenceImage),
      hasPreviewImage: Boolean(effectivePreviewImage),
      activeFileName: activeFile?.name,
      activeFileChars: (activeFile?.content || '').length,
    });
  }

  try {
    const stream = await service.sendMessageStream(enrichedPayload, activeFile.content, images, tasksRef.current);

    let fullResponseText = '';
    let functionCallData: any = null;

    for await (const chunk of stream) {
      if (chunk.text && chunk.text.length > 0) {
        fullResponseText += chunk.text;
        setMessages((prev) => {
          const lastIdx = prev.length - 1;
          const last = prev[lastIdx];
          if (last && last.sender === Sender.Bot) {
            return prev.map((m, i) => (i === lastIdx ? { ...m, text: fullResponseText, statusText: undefined } : m));
          }
          return prev;
        });
      }
      if (chunk.functionCalls && chunk.functionCalls.length > 0) {
        functionCallData = chunk.functionCalls[0];
      }
    }

    if (!functionCallData) {
      const extracted = extractToolCallFromText(fullResponseText);
      if (extracted.toolCall) {
        functionCallData = extracted.toolCall;
        fullResponseText = extracted.cleanedText;
        debugLog('conversation.toolCall.extractedFromText', {
          name: functionCallData?.name,
          id: functionCallData?.id,
          argsKeys: Object.keys(functionCallData?.args || {}),
        });
        setMessages((prev) => {
          const lastIdx = prev.length - 1;
          const last = prev[lastIdx];
          if (last && last.sender === Sender.Bot) {
            return prev.map((m, i) => (i === lastIdx ? { ...m, text: fullResponseText, statusText: undefined } : m));
          }
          return prev;
        });
      }
    }

    if (!functionCallData) {
      debugLog('conversation.noToolCall', {
        recursionDepth,
        responseChars: fullResponseText.length,
        responseTail: fullResponseText.slice(-300),
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.sender === Sender.Bot && m.isStreaming ? { ...m, isStreaming: false, statusText: undefined } : m,
        ),
      );

      const hasPending = (tasksRef.current || []).some((t) => t.status === 'pending');
      if (hasPending) {
        const key = normalizeLoopKey(fullResponseText);
        const isRepeating = key && key === autoLoopGuardRef.current.lastNoToolResponseKey;
        const looksLikeNarration = looksLikeToolNarrationWithoutCall(fullResponseText);
        autoLoopGuardRef.current.noToolStreak += isRepeating || looksLikeNarration || !key ? 1 : 1;
        autoLoopGuardRef.current.lastNoToolResponseKey = key;

        if (autoLoopGuardRef.current.noToolStreak >= 3) {
          const continueId = `loop-continue-${Date.now()}`;
          setBotStatus(undefined);
          setMessages((prev) => [
            ...prev,
            {
              id: continueId,
              sender: Sender.Bot,
              text: '⚠️ 检测到可能的自动循环：当前有未完成任务，但模型连续多次未实际发出工具调用（只在文字里说要用 read_file/rewite）。为避免请求风暴，我已暂停自动推进。',
              timestamp: Date.now(),
              collapsible: {
                title: 'Loop Guard（点击展开）',
                content: `noToolStreak=${autoLoopGuardRef.current.noToolStreak}\nlastNoToolKey=${key}\nlooksLikeNarration=${looksLikeNarration}`,
                defaultOpen: false,
              },
              actions: [
                {
                  label: 'Retry (force tool call)',
                  variant: 'primary',
                  onAction: async () => {
                    setMessages((prev) => prev.map((m) => (m.id === continueId ? { ...m, actions: [] } : m)));
                    await processConversationTurn(
                      'You MUST execute the next tool call now using function calling. Do NOT narrate "I will use read_file". If you need context, CALL read_file.',
                      undefined,
                      0,
                      deps,
                    );
                  },
                },
                {
                  label: 'Continue once',
                  variant: 'secondary',
                  onAction: async () => {
                    setMessages((prev) => prev.map((m) => (m.id === continueId ? { ...m, actions: [] } : m)));
                    await processConversationTurn(
                      'Continue with the next pending task in the plan.',
                      undefined,
                      0,
                      deps,
                    );
                  },
                },
              ],
            },
          ]);
          setIsLoading(false);
          return;
        }

        setBotStatus(undefined);
        await processConversationTurn(
          looksLikeNarration
            ? 'Execute the next tool call now using function calling. Do NOT narrate. If you need context, CALL read_file and proceed.'
            : 'Continue with the next pending task in the plan.',
          undefined,
          recursionDepth + 1,
          deps,
        );
        return;
      }

      const hasTasks = (tasksRef.current || []).length > 0;
      const allDone =
        hasTasks && !(tasksRef.current || []).some((t) => t.status === 'pending' || t.status === 'in_progress');
      if (allDone) {
        setMessages((prev) => [
          ...prev,
          {
            id: `done-${Date.now()}`,
            sender: Sender.Bot,
            text: '✨ **任务已全部完成！** 请检查预览窗口以验证结果。',
            timestamp: Date.now(),
          },
        ]);
      }

      setBotStatus(undefined);
      setIsLoading(false);
      return;
    }

    debugLog('conversation.toolCall.detected', {
      name: functionCallData?.name,
      id: functionCallData?.id,
      argsKeys: Object.keys(functionCallData?.args || {}),
    });
    await handleToolCallFlow(functionCallData, recursionDepth, deps, async (nextInput) => {
      await processConversationTurn(nextInput, undefined, recursionDepth + 1, deps);
    });
  } catch (error: any) {
    console.error(error);
    debugLog('conversation.error', {
      recursionDepth,
      message: error?.message,
      stack: error?.stack,
    });
    const msg =
      error?.message && String(error.message).includes('API Key')
        ? 'API Key Error. Please check settings.'
        : 'Sorry, I encountered an error.';
    setBotStatus(undefined);
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: Sender.Bot, text: msg, timestamp: Date.now() },
    ]);
    setIsLoading(false);
  }
};
