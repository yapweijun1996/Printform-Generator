import { Sender } from '../../types';
import type { ConversationHandlerDependencies } from './conversationTypes';
import { executeToolCall } from './toolExecutor';

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
    setIsLoading,
    setBotStatus,
    waitForNextPreviewSnapshot,
    diffCheckEnabled,
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
      await waitForNextPreviewSnapshot(1400);
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

  const isTextToolCall = String(functionCallData.id || '').startsWith('text-tool-');
  if (
    diffCheckEnabled &&
    !isTextToolCall &&
    (functionCallData.name === 'modify_code' || functionCallData.name === 'insert_content')
  ) {
    const diffArgs =
      functionCallData.name === 'modify_code'
        ? {
            operation: functionCallData.args?.operation,
            search_snippet: functionCallData.args?.search_snippet,
            new_code: functionCallData.args?.new_code,
          }
        : {
            operation: functionCallData.args?.position === 'before' ? 'insert_before' : 'insert_after',
            target_snippet: functionCallData.args?.target_snippet,
            new_code: functionCallData.args?.new_code,
          };

    const diffResult = await executeToolCall('diff_check', diffArgs, {
      getActiveFile,
      getAllFiles,
      updateFileContent,
      revertToLatestHistory,
      tasksRef,
      setTasks,
    });

    setBotStatus(undefined);
    setMessages((prev) =>
      prev.map((msg) =>
        msg.sender === Sender.Bot && msg.isStreaming ? { ...msg, isStreaming: false, statusText: undefined } : msg,
      ),
    );

    const confirmId = `confirm-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + 10).toString(),
        sender: Sender.Bot,
        text: '我准备要改动代码。请先确认变更预览（diff）。',
        timestamp: Date.now(),
        collapsible: {
          title: 'Diff Preview（点击展开）',
          content: diffResult.output,
          defaultOpen: false,
        },
      },
      {
        id: confirmId,
        sender: Sender.Bot,
        text: '要应用这些改动吗？',
        timestamp: Date.now(),
        actions: [
          {
            label: 'Apply',
            variant: 'primary',
            onAction: async () => {
              setMessages((prev) => prev.map((m) => (m.id === confirmId ? { ...m, actions: [] } : m)));
              setIsLoading(true);
              await runToolAndContinue();
            },
          },
          {
            label: 'Cancel',
            variant: 'danger',
            onAction: () => {
              setMessages((prev) => prev.map((m) => (m.id === confirmId ? { ...m, actions: [] } : m)));
              setMessages((prev) => [
                ...prev,
                {
                  id: (Date.now() + 11).toString(),
                  sender: Sender.Bot,
                  text: '已取消：不会应用任何改动。',
                  timestamp: Date.now(),
                },
              ]);
              setIsLoading(false);
            },
          },
        ],
      },
    ]);

    setIsLoading(false);
    return;
  }

  await runToolAndContinue();
};
