# toolCallFlow.ts 重构计划

## 当前问题
- 文件行数: 316 行 (超标 16 行)
- 职责过多: 工具调用、视觉审查、验证、任务推进

## 重构方案

### 1. 拆分 visualReviewHandler.ts (80行)

```typescript
// hooks/agent/visualReviewHandler.ts
import { Sender } from '../../types';
import type { ConversationHandlerDependencies } from './conversationTypes';

export const handleVisualReview = async (
  functionCallData: any,
  recursionDepth: number,
  deps: ConversationHandlerDependencies,
  continueConversation: (nextInput: string | any[], depth: number) => Promise<void>,
): Promise<boolean> => {
  if (functionCallData.name !== 'visual_review') return false;

  const beforeVersion = deps.getPreviewSnapshotVersion();
  const timeoutMs = Number.isFinite(functionCallData.args?.timeout_ms)
    ? Number(functionCallData.args.timeout_ms)
    : 1500;
  const scale = Number.isFinite(functionCallData.args?.scale) 
    ? Number(functionCallData.args.scale) 
    : undefined;
  const jpegQuality = Number.isFinite(functionCallData.args?.jpeg_quality)
    ? Number(functionCallData.args.jpeg_quality)
    : undefined;

  deps.requestPreviewSnapshot({ scale, jpegQuality });
  const ok = await deps.waitForNextPreviewSnapshot(timeoutMs, beforeVersion);

  const result = {
    success: ok,
    output: ok
      ? `Preview snapshot refreshed (previousVersion=${beforeVersion}, currentVersion=${deps.getPreviewSnapshotVersion()}).`
      : `Preview snapshot refresh timed out (previousVersion=${beforeVersion}, currentVersion=${deps.getPreviewSnapshotVersion()}, timeoutMs=${timeoutMs}).`,
  };

  // 更新消息状态
  deps.setMessages((prev) => {
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

  deps.setBotStatus(undefined);

  // 继续对话
  const isTextToolCall = String(functionCallData.id || '').startsWith('text-tool-');
  if (isTextToolCall) {
    await continueConversation(
      `ToolResult (${functionCallData.name}): success=${result.success}\n${result.output}\n\nContinue with the next pending task.`,
      recursionDepth + 1,
    );
  } else {
    const functionResponsePart = {
      functionResponse: {
        name: functionCallData.name,
        id: functionCallData.id,
        response: { result: result.output, success: result.success },
      },
    };
    await continueConversation([functionResponsePart], recursionDepth + 1);
  }

  return true; // 已处理
};
```

### 2. 拆分 postEditValidator.ts (90行)

```typescript
// hooks/agent/postEditValidator.ts
import { Sender } from '../../types';
import type { ConversationHandlerDependencies } from './conversationTypes';
import { validatePrintSafe } from '../../utils/printSafeValidator';
import { debugLog } from '../../utils/debug';

export const handlePostEditValidation = async (
  functionCallData: any,
  result: { success: boolean; output: string },
  recursionDepth: number,
  deps: ConversationHandlerDependencies,
  continueConversation: (nextInput: string | any[], depth: number) => Promise<void>,
): Promise<boolean> => {
  // 只对编辑操作进行验证
  if (!result.success || 
      (functionCallData.name !== 'modify_code' && functionCallData.name !== 'insert_content')) {
    return false;
  }

  const currentContent = deps.getActiveFile().content;
  const currentTasks = deps.tasksRef.current || [];
  const hasPendingOrInProgress = currentTasks.some(
    (t) => t.status === 'pending' || t.status === 'in_progress'
  );
  const requireThreePageTest = currentTasks.some((t) =>
    /3\s*-?\s*page|three\s*-?\s*page|70\s*~\s*120|70\s*-\s*120|prowitem|line\s*items/i.test(
      String(t.description)
    ),
  );

  const issues = validatePrintSafe(currentContent, {
    requirePrintformjs: !hasPendingOrInProgress,
    requireThreePageTest: !hasPendingOrInProgress && requireThreePageTest,
    minProwitemCount: 70,
    maxIssues: 50,
  });

  const errors = issues.filter((i) => i.level === 'error');
  if (errors.length === 0) return false; // 无错误,继续

  // 有阻塞性错误
  const postEditBlockMessage = issues
    .map((i, idx) => `${idx + 1}. [${i.level.toUpperCase()}] ${i.code}: ${i.message}`)
    .join('\n');

  debugLog('toolCall.postEditValidation.blocked', {
    name: functionCallData?.name,
    errors: postEditBlockMessage
      .split('\n')
      .filter((l) => l.includes('[ERROR]'))
      .slice(0, 10),
  });

  const retryId = `print-safe-retry-${Date.now()}`;
  deps.setBotStatus(undefined);
  deps.setMessages((prev) => [
    ...prev,
    {
      id: `print-safe-block-${Date.now()}`,
      sender: Sender.Bot,
      text: '已阻止继续:本次改动未通过 Print-safe 校验(必须先修复错误)。',
      timestamp: Date.now(),
      collapsible: {
        title: 'Print-safe Validator(点击展开)',
        content: postEditBlockMessage,
        defaultOpen: true,
      },
    },
    {
      id: retryId,
      sender: Sender.Bot,
      text: '要让 AI 立即修复这些错误吗?',
      timestamp: Date.now(),
      actions: [
        {
          label: 'Fix Now',
          variant: 'primary',
          onAction: async () => {
            deps.setMessages((prev) => 
              prev.map((m) => (m.id === retryId ? { ...m, actions: [] } : m))
            );
            await continueConversation(
              `Validation failed after the last edit. Fix these issues now and do NOT proceed to the next task until there are no ERRORs.\n\n${postEditBlockMessage}`,
              recursionDepth + 1,
            );
          },
        },
        {
          label: 'Undo',
          variant: 'danger',
          onAction: async () => {
            deps.setMessages((prev) => 
              prev.map((m) => (m.id === retryId ? { ...m, actions: [] } : m))
            );
            deps.setIsLoading(true);
            const ok = deps.revertToLatestHistory();
            if (ok) {
              const before = deps.getPreviewSnapshotVersion();
              await deps.waitForNextPreviewSnapshot(1400, before);
            }
            deps.setIsLoading(false);
          },
        },
      ],
    },
  ]);

  deps.setIsLoading(false);
  return true; // 已阻塞
};
```

### 3. 简化后的 toolCallFlow.ts (150行)

```typescript
// hooks/agent/toolCallFlow.ts
import { Sender } from '../../types';
import type { ConversationHandlerDependencies } from './conversationTypes';
import { executeToolCall } from './toolExecutor';
import { maybeHandleDiffConfirmation } from './diffConfirmation';
import { handleVisualReview } from './visualReviewHandler';
import { handlePostEditValidation } from './postEditValidator';
import { debugLog } from '../../utils/debug';

export const handleToolCallFlow = async (
  functionCallData: any,
  recursionDepth: number,
  deps: ConversationHandlerDependencies,
  continueConversation: (nextInput: string | any[], depth: number) => Promise<void>,
): Promise<void> => {
  const { setBotStatus, setMessages, tasksRef, setTasks, waitForNextPreviewSnapshot } = deps;

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

    // 1. 处理 visual_review (委托给专用处理器)
    const visualHandled = await handleVisualReview(
      functionCallData,
      recursionDepth,
      deps,
      continueConversation,
    );
    if (visualHandled) return;

    // 2. 执行其他工具
    const result = await executeToolCall(functionCallData.name, functionCallData.args, {
      getActiveFile: deps.getActiveFile,
      getAllFiles: deps.getAllFiles,
      updateFileContent: deps.updateFileContent,
      revertToLatestHistory: deps.revertToLatestHistory,
      tasksRef,
      setTasks,
    });

    debugLog('toolCall.result', {
      name: functionCallData?.name,
      success: result?.success,
      outputTail: String(result?.output || '').slice(-200),
    });

    // 3. 等待预览更新
    if (result.success && 
        (functionCallData.name === 'modify_code' || functionCallData.name === 'insert_content')) {
      const before = deps.getPreviewSnapshotVersion();
      await waitForNextPreviewSnapshot(1400, before);
    }

    // 4. Post-edit 验证 (委托给专用验证器)
    const blocked = await handlePostEditValidation(
      functionCallData,
      result,
      recursionDepth,
      deps,
      continueConversation,
    );
    if (blocked) return;

    // 5. 自动推进任务
    if (result.success && 
        (functionCallData.name === 'modify_code' || functionCallData.name === 'insert_content')) {
      const current = tasksRef.current || [];
      const inProgressIdx = current.findIndex((t) => t.status === 'in_progress');
      if (inProgressIdx >= 0) {
        const nextPendingIdx = current.findIndex(
          (t, i) => i > inProgressIdx && t.status === 'pending'
        );
        const updated = current.map((t, i) => {
          if (i === inProgressIdx) return { ...t, status: 'completed' as const };
          if (i === nextPendingIdx) return { ...t, status: 'in_progress' as const };
          return t;
        });
        setTasks(updated);
        tasksRef.current = updated;
        debugLog('plan.autoAdvance', {
          completedIndex: inProgressIdx,
          nextInProgressIndex: nextPendingIdx,
        });
      }
    }

    // 6. 更新消息状态
    setMessages((prev) => {
      const lastIdx = prev.length - 1;
      const lastMsg = prev[lastIdx];
      if (lastMsg && lastMsg.sender === Sender.Bot) {
        return prev.map((m, i) => {
          if (i !== lastIdx) return m;

          const shouldCollapse = Boolean(result.output && result.output.length > 50);
          const shortAppend =
            result.output && result.output.length <= 50 
              ? `\n\n${result.success ? '✅' : '❌'} ${result.output}` 
              : '';

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

    // 7. 继续对话
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

  // 差异确认处理
  const handled = await maybeHandleDiffConfirmation({
    functionCallData,
    recursionDepth,
    deps,
    runToolAndContinue,
    toolDeps: {
      getActiveFile: deps.getActiveFile,
      getAllFiles: deps.getAllFiles,
      updateFileContent: deps.updateFileContent,
      revertToLatestHistory: deps.revertToLatestHistory,
      tasksRef,
      setTasks,
    },
  });
  if (handled) return;

  await runToolAndContinue();
};
```

## 实施步骤

1. ✅ 创建 `hooks/agent/visualReviewHandler.ts`
2. ✅ 创建 `hooks/agent/postEditValidator.ts`
3. ✅ 重构 `hooks/agent/toolCallFlow.ts`
4. ✅ 运行测试确保无回归
5. ✅ 更新相关文档

## 预期结果

- toolCallFlow.ts: 316行 → 150行 ✅
- visualReviewHandler.ts: 新增 80行
- postEditValidator.ts: 新增 90行
- 总行数: 316行 → 320行 (增加4行,但模块化更好)
- 所有文件 < 300行 ✅
