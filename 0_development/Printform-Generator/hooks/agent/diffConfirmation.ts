import { Sender } from '../../types';
import type { ConversationHandlerDependencies } from './conversationTypes';
import { executeToolCall } from './toolExecutor';

export const maybeHandleDiffConfirmation = async (params: {
  functionCallData: any;
  recursionDepth: number;
  deps: ConversationHandlerDependencies;
  runToolAndContinue: () => Promise<void>;
  toolDeps: {
    getActiveFile: ConversationHandlerDependencies['getActiveFile'];
    getAllFiles: ConversationHandlerDependencies['getAllFiles'];
    updateFileContent: ConversationHandlerDependencies['updateFileContent'];
    revertToLatestHistory: ConversationHandlerDependencies['revertToLatestHistory'];
    tasksRef: ConversationHandlerDependencies['tasksRef'];
    setTasks: ConversationHandlerDependencies['setTasks'];
  };
}): Promise<boolean> => {
  const { functionCallData, deps, runToolAndContinue, toolDeps, recursionDepth } = params;
  const {
    diffCheckEnabled,
    autoApplyDiff,
    strictPreviewGate,
    requestPreviewSnapshot,
    getPreviewSnapshotVersion,
    waitForNextPreviewSnapshot,
    previewImageRef,
    setBotStatus,
    setMessages,
    setIsLoading,
  } = deps;

  const isTextToolCall = String(functionCallData.id || '').startsWith('text-tool-');
  const isEditingTool = functionCallData.name === 'modify_code' || functionCallData.name === 'insert_content';
  if (!diffCheckEnabled || isTextToolCall || !isEditingTool) return false;

  const ensurePreviewFresh = async (): Promise<boolean> => {
    if (!strictPreviewGate) return true;
    const beforeVersion = getPreviewSnapshotVersion();
    requestPreviewSnapshot();
    const ok = await waitForNextPreviewSnapshot(900, beforeVersion);
    if (ok) return true;

    const hasAnySnapshot = Boolean(previewImageRef.current);
    const retryId = `strict-preview-retry-${Date.now()}`;

    setBotStatus(undefined);
    setMessages((prev) => [
      ...prev,
      {
        id: `strict-preview-block-${Date.now()}`,
        sender: Sender.Bot,
        text: hasAnySnapshot
          ? '严格模式：Preview 快照刷新超时，已阻止本次改动。请点击 Retry 重新刷新预览。'
          : '严格模式：未获取到 Preview 快照，已阻止本次改动。请先确保预览正常渲染后再 Retry。',
        timestamp: Date.now(),
        collapsible: {
          title: 'Strict Preview Gate（点击展开）',
          content: `snapshotRefreshed=false\npreviousVersion=${beforeVersion}\ncurrentVersion=${getPreviewSnapshotVersion()}\ntimeoutMs=900`,
          defaultOpen: false,
        },
      },
      {
        id: retryId,
        sender: Sender.Bot,
        text: '要重试刷新 Preview 快照并继续吗？',
        timestamp: Date.now(),
        actions: [
          {
            label: 'Retry',
            variant: 'primary',
            onAction: async () => {
              setMessages((prev) => prev.map((m) => (m.id === retryId ? { ...m, actions: [] } : m)));
              setIsLoading(true);
              const refreshed = await ensurePreviewFresh();
              if (!refreshed) {
                setIsLoading(false);
                return;
              }
              await maybeHandleDiffConfirmation({
                functionCallData,
                recursionDepth,
                deps,
                runToolAndContinue,
                toolDeps,
              });
            },
          },
          {
            label: 'Cancel',
            variant: 'danger',
            onAction: () => {
              setMessages((prev) => prev.map((m) => (m.id === retryId ? { ...m, actions: [] } : m)));
              setMessages((prev) => [
                ...prev,
                {
                  id: (Date.now() + 1).toString(),
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
    return false;
  };

  const refreshedOk = await ensurePreviewFresh();
  if (!refreshedOk) return true;

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

  const diffResult = await executeToolCall('diff_check', diffArgs, toolDeps);

  if (autoApplyDiff) {
    setMessages((prev) => {
      const lastIdx = prev.length - 1;
      const lastMsg = prev[lastIdx];
      if (!lastMsg || lastMsg.sender !== Sender.Bot) return prev;
      return prev.map((m, i) =>
        i === lastIdx
          ? {
              ...m,
              collapsible: {
                title: 'Diff Preview（点击展开）',
                content: diffResult.output,
                defaultOpen: false,
              },
              text: m.text || '已生成 diff 预览，正在自动应用改动…',
            }
          : m,
      );
    });

    setIsLoading(true);
    await runToolAndContinue();
    return true;
  }

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
  return true;
};
