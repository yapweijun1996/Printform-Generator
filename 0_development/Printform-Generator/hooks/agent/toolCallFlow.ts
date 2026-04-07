import { Sender } from '../../types';
import type { ConversationHandlerDependencies } from './conversationTypes';
import { executeToolCall } from './toolExecutor';
import { maybeHandleDiffConfirmation } from './diffConfirmation';
import { validatePrintSafe } from '../../utils/printSafeValidator';
import { debugLog } from '../../utils/debug';

/**
 * Tool Call Flow (v2)
 *
 * Changes from v1:
 * - REMOVED: auto-advance plan on successful edit (now only manage_plan / goalEvaluator can advance)
 * - ADDED: structured tool result via functionResponse
 * - ADDED: artifacts/stateDelta/followupHints passthrough
 */
export const handleToolCallFlow = async (
  functionCallData: any,
  recursionDepth: number,
  deps: ConversationHandlerDependencies,
  continueConversation: (nextInput: string | any[]) => Promise<void>,
): Promise<void> => {
  const {
    getActiveFile,
    getAllFiles,
    updateFileContent,
    revertToLatestHistory,
    tasksRef,
    setTasks,
    setMessages,
    setIsLoading,
    setBotStatus,
    waitForNextPreviewSnapshot,
  } = deps;

  let friendlyActionName = 'Executing tool...';
  if (functionCallData.name === 'manage_plan') friendlyActionName = 'Updating project plan...';
  if (functionCallData.name === 'modify_code') friendlyActionName = 'Applying code changes...';
  if (functionCallData.name === 'insert_content') friendlyActionName = 'Inserting new content...';
  if (functionCallData.name === 'visual_review') friendlyActionName = 'Refreshing preview snapshot...';

  const runToolAndContinue = async () => {
    setBotStatus(friendlyActionName);
    await new Promise((r) => setTimeout(r, 400));

    debugLog('toolCall.start', {
      recursionDepth,
      name: functionCallData?.name,
      id: functionCallData?.id,
      args: functionCallData?.args,
    });

    // ── visual_review: special handling ──
    if (functionCallData.name === 'visual_review') {
      const beforeVersion = deps.getPreviewSnapshotVersion();
      const timeoutMs = Number.isFinite(functionCallData.args?.timeout_ms)
        ? Number(functionCallData.args.timeout_ms)
        : 1500;
      const scale = Number.isFinite(functionCallData.args?.scale) ? Number(functionCallData.args.scale) : undefined;
      const jpegQuality = Number.isFinite(functionCallData.args?.jpeg_quality)
        ? Number(functionCallData.args.jpeg_quality)
        : undefined;

      deps.requestPreviewSnapshot({ scale, jpegQuality });
      const ok = await waitForNextPreviewSnapshot(timeoutMs, beforeVersion);

      const result = {
        success: ok,
        output: ok
          ? `Preview snapshot refreshed (previousVersion=${beforeVersion}, currentVersion=${deps.getPreviewSnapshotVersion()}).`
          : `Preview snapshot refresh timed out (previousVersion=${beforeVersion}, currentVersion=${deps.getPreviewSnapshotVersion()}, timeoutMs=${timeoutMs}).`,
      };

      setMessages((prev) => {
        const lastIdx = prev.length - 1;
        const lastMsg = prev[lastIdx];
        if (!lastMsg || lastMsg.sender !== Sender.Bot) return prev;
        return prev.map((m, i) =>
          i !== lastIdx
            ? m
            : {
                ...m,
                isStreaming: false,
                statusText: undefined,
                toolCall: {
                  name: functionCallData.name,
                  args: functionCallData.args,
                  status: result.success ? 'success' : 'error',
                },
                collapsible: {
                  title: `${result.success ? '✅' : '❌'} visual_review Result`,
                  content: result.output,
                  defaultOpen: false,
                },
              },
        );
      });

      setBotStatus(undefined);
      debugLog('toolCall.visual_review.done', {
        ok: result.success,
        beforeVersion,
        currentVersion: deps.getPreviewSnapshotVersion(),
      });

      // Deposit actual tool result for session persistence
      if (deps.lastToolResultRef) {
        deps.lastToolResultRef.current = { success: result.success, output: result.output, toolName: 'visual_review' };
      }

      await sendStructuredResponse(functionCallData, result, continueConversation);
      return;
    }

    // ── Standard tool execution ──
    const result = await executeToolCall(functionCallData.name, functionCallData.args, {
      getActiveFile,
      getAllFiles,
      updateFileContent,
      revertToLatestHistory,
      tasksRef,
      setTasks,
    });

    debugLog('toolCall.result', {
      name: functionCallData?.name,
      success: result?.success,
      outputTail: String(result?.output || '').slice(-200),
      hasStateDelta: Boolean(result?.stateDelta),
      hasFollowupHints: Boolean(result?.followupHints?.length),
    });

    // Deposit actual tool result for session persistence
    if (deps.lastToolResultRef) {
      deps.lastToolResultRef.current = {
        success: result.success,
        output: String(result.output || '').slice(0, 500),
        toolName: String(functionCallData.name || ''),
      };
    }

    // Refresh preview after destructive edits
    if (result.success && (functionCallData.name === 'modify_code' || functionCallData.name === 'insert_content')) {
      const before = deps.getPreviewSnapshotVersion();
      await waitForNextPreviewSnapshot(1400, before);
    }

    // ── Post-edit hard gate: PrintSafe validation ──
    let postEditBlockMessage: string | null = null;
    let hasBlockingValidationErrors = false;
    if (result.success && (functionCallData.name === 'modify_code' || functionCallData.name === 'insert_content')) {
      const currentContent = getActiveFile().content;
      const currentTasks = tasksRef.current || [];
      const hasPendingOrInProgress = currentTasks.some((t) => t.status === 'pending' || t.status === 'in_progress');
      const requireThreePageTest = currentTasks.some((t) =>
        /3\s*-?\s*page|three\s*-?\s*page|70\s*~\s*120|70\s*-\s*120|prowitem|line\s*items/i.test(String(t.description)),
      );
      const issues = validatePrintSafe(currentContent, {
        requirePrintformjs: !hasPendingOrInProgress,
        requireThreePageTest: !hasPendingOrInProgress && requireThreePageTest,
        minProwitemCount: 20,
        maxIssues: 50,
      });
      const errors = issues.filter((i) => i.level === 'error');
      if (errors.length > 0) {
        hasBlockingValidationErrors = true;
        postEditBlockMessage = issues
          .map((i, idx) => `${idx + 1}. [${i.level.toUpperCase()}] ${i.code}: ${i.message}`)
          .join('\n');
      }
    }

    if (hasBlockingValidationErrors && postEditBlockMessage) {
      debugLog('toolCall.postEditValidation.blocked', {
        name: functionCallData?.name,
        errors: postEditBlockMessage
          .split('\n')
          .filter((l) => l.includes('[ERROR]'))
          .slice(0, 10),
      });
      const retryId = `print-safe-retry-${Date.now()}`;
      setBotStatus(undefined);
      setMessages((prev) => [
        ...prev,
        {
          id: `print-safe-block-${Date.now()}`,
          sender: Sender.Bot,
          text: '已阻止继续：本次改动未通过 Print-safe 校验（必须先修复错误）。',
          timestamp: Date.now(),
          collapsible: {
            title: 'Print-safe Validator（点击展开）',
            content: postEditBlockMessage!,
            defaultOpen: true,
          },
        },
        {
          id: retryId,
          sender: Sender.Bot,
          text: '要让 AI 立即修复这些错误吗？',
          timestamp: Date.now(),
          actions: [
            {
              label: 'Fix Now',
              variant: 'primary',
              onAction: async () => {
                setMessages((prev) => prev.map((m) => (m.id === retryId ? { ...m, actions: [] } : m)));
                await continueConversation(
                  `Validation failed after the last edit. Fix these issues now and do NOT proceed to the next task until there are no ERRORs.\n\n${postEditBlockMessage}`,
                );
              },
            },
            {
              label: 'Undo',
              variant: 'danger',
              onAction: async () => {
                setMessages((prev) => prev.map((m) => (m.id === retryId ? { ...m, actions: [] } : m)));
                setIsLoading(true);
                const ok = revertToLatestHistory();
                if (ok) {
                  const before = deps.getPreviewSnapshotVersion();
                  await waitForNextPreviewSnapshot(1400, before);
                }
                setIsLoading(false);
              },
            },
          ],
        },
      ]);

      setIsLoading(false);
      return;
    }

    // ── NOTE: No auto-advance here! ──
    // Plan advancement is now controlled exclusively by manage_plan / goalEvaluator.
    // The old implicit "modify_code success → auto-complete task" logic is removed.

    // ── Update UI ──
    setMessages((prev) => {
      const lastIdx = prev.length - 1;
      const lastMsg = prev[lastIdx];
      if (lastMsg && lastMsg.sender === Sender.Bot) {
        return prev.map((m, i) => {
          if (i !== lastIdx) return m;

          const shouldCollapse = Boolean(result.output && result.output.length > 50);
          const shortAppend =
            result.output && result.output.length <= 50 ? `\n\n${result.success ? '✅' : '❌'} ${result.output}` : '';

          return {
            ...m,
            isStreaming: false,
            statusText: undefined,
            toolCall: {
              name: functionCallData.name,
              args: functionCallData.args,
              status: result.success ? 'success' : 'error',
            },
            collapsible: shouldCollapse
              ? {
                  title: `${result.success ? '✅' : '❌'} ${functionCallData.name} Result`,
                  content: result.output,
                }
              : undefined,
            text: (m.text || '') + shortAppend,
          };
        });
      }
      return prev;
    });

    setBotStatus(undefined);

    // ── Send structured response back to model ──
    await sendStructuredResponse(functionCallData, result, continueConversation);
  };

  // ── Diff confirmation gate ──
  const handled = await maybeHandleDiffConfirmation({
    functionCallData,
    recursionDepth,
    deps,
    runToolAndContinue,
    toolDeps: {
      getActiveFile,
      getAllFiles,
      updateFileContent,
      revertToLatestHistory,
      tasksRef,
      setTasks,
    },
  });
  if (handled) return;

  await runToolAndContinue();
};

/**
 * Send structured functionResponse or text fallback to the model
 */
const sendStructuredResponse = async (
  functionCallData: any,
  result: { success: boolean; output: string; stateDelta?: Record<string, any>; followupHints?: string[] },
  continueConversation: (nextInput: string | any[]) => Promise<void>,
) => {
  const isTextToolCall = String(functionCallData.id || '').startsWith('text-tool-');

  if (isTextToolCall) {
    // Text tool calls get text-based responses
    const parts = [
      `ToolResult (${functionCallData.name}): success=${result.success}`,
      result.output,
    ];
    if (result.stateDelta) {
      parts.push(`stateDelta: ${JSON.stringify(result.stateDelta)}`);
    }
    if (result.followupHints && result.followupHints.length > 0) {
      parts.push(`followupHints: ${result.followupHints.join('; ')}`);
    }
    parts.push('Continue with the current task. Only advance the plan via manage_plan when the task is truly complete.');
    await continueConversation(parts.join('\n'));
    return;
  }

  // Structured functionResponse for native tool calls
  const response: Record<string, any> = {
    result: result.output,
    success: result.success,
  };
  if (result.stateDelta) {
    response.stateDelta = result.stateDelta;
  }
  if (result.followupHints && result.followupHints.length > 0) {
    response.followupHints = result.followupHints;
  }

  const functionResponsePart = {
    functionResponse: {
      name: functionCallData.name,
      id: functionCallData.id,
      response,
    },
  };
  await continueConversation([functionResponsePart]);
};
