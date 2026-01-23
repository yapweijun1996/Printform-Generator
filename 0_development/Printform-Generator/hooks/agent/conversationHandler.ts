import { Sender } from '../../types';
import type { ConversationHandlerDependencies } from './conversationTypes';
import { extractToolCallFromText } from './textToolCall';
import { handleToolCallFlow } from './toolCallFlow';

export const processConversationTurn = async (
  inputPayload: string | any[],
  image: { mimeType: string; data: string } | undefined,
  recursionDepth: number,
  deps: ConversationHandlerDependencies,
): Promise<void> => {
  const {
    geminiServiceRef,
    getActiveFile,
    tasksRef,
    referenceImageRef,
    previewImageRef,
    requestPreviewSnapshot,
    getPreviewSnapshotVersion,
    waitForNextPreviewSnapshot,
    setMessages,
    setIsLoading,
    setBotStatus,
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

  const service = geminiServiceRef.current;
  if (!service) throw new Error('Gemini service not initialized');

  // Preflight: refresh preview snapshot before asking the model to amend code (best-effort).
  if (recursionDepth === 0) {
    const beforeVersion = getPreviewSnapshotVersion();
    requestPreviewSnapshot();
    const ok = await waitForNextPreviewSnapshot(900, beforeVersion);
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
          content: `snapshotRefreshed=${ok}\npreviousVersion=${beforeVersion}\ncurrentVersion=${getPreviewSnapshotVersion()}\ntimeoutMs=900`,
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
  const images = [effectiveReferenceImage, effectivePreviewImage].filter(Boolean) as Array<{
    mimeType: string;
    data: string;
  }>;

  try {
    const stream = await service.sendMessageStream(inputPayload, activeFile.content, images, tasksRef.current);

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
      setMessages((prev) =>
        prev.map((m) =>
          m.sender === Sender.Bot && m.isStreaming ? { ...m, isStreaming: false, statusText: undefined } : m,
        ),
      );

      const hasPending = (tasksRef.current || []).some((t) => t.status === 'pending');
      if (hasPending) {
        setBotStatus(undefined);
        await processConversationTurn(
          'Continue with the next pending task in the plan.',
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

    await handleToolCallFlow(functionCallData, recursionDepth, deps, async (nextInput, depth) => {
      await processConversationTurn(nextInput, undefined, depth, deps);
    });
  } catch (error: any) {
    console.error(error);
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
