import { Sender } from '../../types';
import type { ConversationHandlerDependencies } from './conversationTypes';
import { executeToolCall } from './toolExecutor';
import { maybeHandleDiffConfirmation } from './diffConfirmation';

export const handleToolCallFlow = async (
  functionCallData: any,
  recursionDepth: number,
  deps: ConversationHandlerDependencies,
  continueConversation: (nextInput: string | any[], depth: number) => Promise<void>,
): Promise<void> => {
  const {
    getActiveFile,
    getAllFiles,
    updateFileContent,
    revertToLatestHistory,
    tasksRef,
    setTasks,
    setMessages,
    setBotStatus,
    waitForNextPreviewSnapshot,
  } = deps;

  let friendlyActionName = 'Executing tool...';
  if (functionCallData.name === 'manage_plan') friendlyActionName = 'Updating project plan...';
  if (functionCallData.name === 'modify_code') friendlyActionName = 'Applying code changes...';
  if (functionCallData.name === 'insert_content') friendlyActionName = 'Inserting new content...';

  const runToolAndContinue = async () => {
    setBotStatus(friendlyActionName);
    await new Promise((r) => setTimeout(r, 400));

    const result = await executeToolCall(functionCallData.name, functionCallData.args, {
      getActiveFile,
      getAllFiles,
      updateFileContent,
      revertToLatestHistory,
      tasksRef,
      setTasks,
    });

    if (result.success && (functionCallData.name === 'modify_code' || functionCallData.name === 'insert_content')) {
      const before = deps.getPreviewSnapshotVersion();
      await waitForNextPreviewSnapshot(1400, before);
    }

    if (result.success && (functionCallData.name === 'modify_code' || functionCallData.name === 'insert_content')) {
      const current = tasksRef.current || [];
      const inProgressIdx = current.findIndex((t) => t.status === 'in_progress');
      if (inProgressIdx >= 0) {
        const nextPendingIdx = current.findIndex((t, i) => i > inProgressIdx && t.status === 'pending');
        const updated = current.map((t, i) => {
          if (i === inProgressIdx) return { ...t, status: 'completed' as const };
          if (i === nextPendingIdx) return { ...t, status: 'in_progress' as const };
          return t;
        });
        setTasks(updated);
        tasksRef.current = updated;
      }
    }

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

    const isTextToolCall = String(functionCallData.id || '').startsWith('text-tool-');
    if (isTextToolCall) {
      await continueConversation(
        `ToolResult (${functionCallData.name}): success=${result.success}\n${result.output}\n\nContinue with the next pending task.`,
        recursionDepth + 1,
      );
      return;
    }

    const functionResponsePart = {
      functionResponse: {
        name: functionCallData.name,
        id: functionCallData.id,
        response: { result: result.output, success: result.success },
      },
    };

    await continueConversation([functionResponsePart], recursionDepth + 1);
  };

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
