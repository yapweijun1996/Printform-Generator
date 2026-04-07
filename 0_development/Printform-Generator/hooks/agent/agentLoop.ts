/**
 * Agent Loop — Harness Engineering 7 步架构
 *
 * 1. SESSION    — 初始化会话 + 刷新 Preview 快照
 * 2. FEEDFORWARD — 上下文工程 + Auto-Grounding + Guard Rails
 * 3. MODEL      — Gemini API 流式调用
 * 4. EXECUTE    — Tool Registry 查找 + 执行
 * 5. FEEDBACK   — PrintSafe / HTML / Diff / 完整性校验
 * 6. QUALITY GATE — 评分 Pass(≥8) / Fix(4~7) / Rollback(<4)
 * 7. CONTINUATION — pending 任务检查 + Loop Guard
 */
import { Sender } from '../../types';
import type { ConversationHandlerDependencies } from './conversationTypes';
import { extractToolCallFromText } from './textToolCall';
import { handleToolCallFlow } from './toolCallFlow';
import { buildAutoGroundingContext } from './autoGrounding';
import { evaluateAfterExecution } from './feedbackController';
import { decide } from './qualityGate';
import { evaluateGoal } from './goalEvaluator';
import {
  createSession, saveCheckpoint, incrementMetric, formatMetrics,
  persistSession, loadPersistedSession, clearPersistedSession,
  updateSessionField, updateLoopGuard,
} from './sessionManager';
import type { SessionState } from './sessionManager';
import { inferTaskType, getCurrentTask, getContextStrategy, buildContextPayload } from './contextEngineer';
import { getToolByName } from './toolRegistry';
import { debugLog } from '../../utils/debug';

const MAX_TURNS = 100;

const normalizeLoopKey = (s: string) =>
  String(s || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 220);

const looksLikeToolNarrationWithoutCall = (s: string) => {
  const t = normalizeLoopKey(s).toLowerCase();
  return (
    /wait,?\s*i('|')ll\s+(use|just)\s+`?(read_file|read_all_files|grep_search|modify_code|insert_content|manage_plan|diff_check|undo_last)/i.test(t) ||
    /i('|')ll\s+use\s+`?read_file/i.test(t) ||
    /i('|')ll\s+just\s+rewrite/i.test(t)
  );
};

// ─────────────────────────────────────────────
// STEP 1: SESSION — 初始化 + Preview 快照
// ─────────────────────────────────────────────
const initSession = async (
  deps: ConversationHandlerDependencies,
  initialInput: string,
  tryRestore: boolean = false,
): Promise<{ session: SessionState; restored: boolean }> => {
  // Try restoring persisted session
  let session: SessionState | undefined;
  let restored = false;

  if (tryRestore) {
    const persisted = await loadPersistedSession();
    if (persisted && persisted.tasks.length > 0) {
      session = persisted;
      restored = true;
      // Restore tasks into React state
      deps.setTasks(persisted.tasks);

      // Restore file content from latest checkpoint
      const latestCp = persisted.checkpoints[persisted.checkpoints.length - 1];
      if (latestCp && latestCp.fileContent) {
        deps.updateFileContent(latestCp.fileContent, `Restored from checkpoint ${latestCp.id}`);
        debugLog('agentLoop.sessionRestore.checkpoint', { cpId: latestCp.id, chars: latestCp.fileContent.length });
      }

      debugLog('agentLoop.sessionRestore', { sessionId: persisted.sessionId, tasks: persisted.tasks.length, hasCheckpoint: Boolean(latestCp) });
    }
  }

  if (!session) {
    session = createSession(initialInput);
  }

  const { activeTools, requestPreviewSnapshot, getPreviewSnapshotVersion, waitForNextPreviewSnapshot, previewImageRef, setMessages } = deps;
  const beforeVersion = getPreviewSnapshotVersion();
  const allowHighRes = (activeTools || []).includes('visual_review') || (activeTools || []).includes('image_analysis');
  requestPreviewSnapshot(allowHighRes ? { scale: 0.8, jpegQuality: 0.6 } : undefined);
  const ok = await waitForNextPreviewSnapshot(1500, beforeVersion);
  const hasAnySnapshot = Boolean(previewImageRef.current);

  const statusText = restored
    ? `Session：已恢复上次会话 (${session.tasks.filter((t) => t.status === 'completed').length}/${session.tasks.length} tasks done)。`
    : ok
      ? 'Session：已初始化并刷新 Preview 快照。'
      : hasAnySnapshot
        ? 'Session：已初始化（Preview 快照刷新超时，使用上一次快照）。'
        : 'Session：已初始化（无 Preview 快照，仅依据代码上下文）。';

  setMessages((prev) => [
    ...prev,
    {
      id: `session-${session!.sessionId}`,
      sender: Sender.Bot,
      text: statusText,
      timestamp: Date.now(),
      collapsible: {
        title: 'Session Init（点击展开）',
        content: `sessionId=${session!.sessionId}\nrestored=${restored}\nsnapshotRefreshed=${ok}\npreviewVersion=${getPreviewSnapshotVersion()}`,
        defaultOpen: false,
      },
    },
  ]);

  return { session, restored };
};

// ─────────────────────────────────────────────
// STEP 2: FEEDFORWARD — 上下文工程
// ─────────────────────────────────────────────
const buildFeedforwardPayload = async (
  inputPayload: string | any[],
  deps: ConversationHandlerDependencies,
  turnCount: number,
  session?: SessionState,
): Promise<string | any[]> => {
  if (typeof inputPayload !== 'string') return inputPayload;

  // Context Engineer: build structured context payload
  const tasks = deps.tasksRef.current || [];
  const currentTask = getCurrentTask(tasks);
  const taskType = inferTaskType(currentTask);

  debugLog('agentLoop.feedforward', { taskType, task: currentTask?.description?.slice(0, 80) });

  const contextPayload = buildContextPayload({
    fileContent: deps.getActiveFile().content,
    tasks,
    pageWidth: deps.pageWidth,
    pageHeight: deps.pageHeight,
    hasPreviewImage: Boolean(deps.previewImageRef.current),
    hasReferenceImage: Boolean(deps.referenceImageRef.current),
    lastToolResult: session?.lastToolResult || undefined,
  });

  debugLog('agentLoop.contextPayload', {
    taskType: contextPayload.taskType,
    includedSources: contextPayload.includedSources,
    promptChars: contextPayload.promptChars,
  });

  // Auto-Grounding: 模板加载 + 预检 (first turn or create tasks)
  const autoGrounding = await buildAutoGroundingContext({
    userMessage: inputPayload,
    deps,
    recursionDepth: turnCount,
    hasReferenceImage: Boolean(deps.referenceImageRef.current),
  });

  return `${contextPayload.contextBlock}\n\n${autoGrounding}\n\n[USER REQUEST]\n${inputPayload}`;
};

// ─────────────────────────────────────────────
// STEP 3: MODEL — Gemini API 流式调用
// ─────────────────────────────────────────────
const callModelAndStream = async (
  enrichedPayload: string | any[],
  deps: ConversationHandlerDependencies,
) => {
  const { geminiServiceRef, getActiveFile, tasksRef, referenceImageRef, previewImageRef, setMessages } = deps;
  const service = geminiServiceRef.current;
  if (!service) throw new Error('Gemini service not initialized');

  const activeFile = getActiveFile();
  const images = {
    reference: referenceImageRef.current,
    preview: previewImageRef.current,
  } as { reference?: { mimeType: string; data: string }; preview?: { mimeType: string; data: string } };

  const stream = await service.sendMessageStream(enrichedPayload, activeFile.content, images, tasksRef.current);

  let fullResponseText = '';
  let functionCallData: any = null;

  for await (const chunk of stream) {
    // 先检查 functionCalls，避免读 .text 触发 Gemini SDK 警告
    if (chunk.functionCalls && chunk.functionCalls.length > 0) {
      functionCallData = chunk.functionCalls[0];
    } else if (chunk.text && chunk.text.length > 0) {
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
  }

  // Fallback: 从文本中提取工具调用
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

  return { fullResponseText, functionCallData };
};

// ─────────────────────────────────────────────
// STEP 7: CONTINUATION — pending 任务 + Loop Guard
// ─────────────────────────────────────────────
const evaluateContinuation = (
  fullResponseText: string,
  deps: ConversationHandlerDependencies,
  session?: SessionState,
): { shouldContinue: boolean; nextInput: string; interrupted: boolean; updatedSession?: SessionState } => {
  const { tasksRef, autoLoopGuardRef, setMessages, setIsLoading, setBotStatus } = deps;

  setMessages((prev) =>
    prev.map((m) =>
      m.sender === Sender.Bot && m.isStreaming ? { ...m, isStreaming: false, statusText: undefined } : m,
    ),
  );

  const hasPending = (tasksRef.current || []).some((t) => t.status === 'pending');

  if (!hasPending) {
    const hasTasks = (tasksRef.current || []).length > 0;
    const allDone = hasTasks && !(tasksRef.current || []).some((t) => t.status === 'pending' || t.status === 'in_progress');
    if (allDone) {
      setMessages((prev) => [
        ...prev,
        { id: `done-${Date.now()}`, sender: Sender.Bot, text: '✨ **任务已全部完成！** 请检查预览窗口以验证结果。', timestamp: Date.now() },
      ]);
    }
    setBotStatus(undefined);
    setIsLoading(false);
    return { shouldContinue: false, nextInput: '', interrupted: false };
  }

  // Loop Guard — use session state as source of truth, sync back to ref
  const looksLikeNarration = looksLikeToolNarrationWithoutCall(fullResponseText);
  const currentStreak = (session?.loopGuardState.noToolStreak ?? autoLoopGuardRef.current.noToolStreak) + 1;

  // Sync both session and ref
  autoLoopGuardRef.current.noToolStreak = currentStreak;
  autoLoopGuardRef.current.lastNoToolResponseKey = normalizeLoopKey(fullResponseText);

  let updatedSession = session;
  if (updatedSession) {
    updatedSession = updateLoopGuard(updatedSession, {
      noToolStreak: currentStreak,
      lastNoToolResponseKey: normalizeLoopKey(fullResponseText),
    });
  }

  if (currentStreak >= 3) {
    return { shouldContinue: false, nextInput: '', interrupted: true, updatedSession };
  }

  const nextInput = looksLikeNarration
    ? 'Execute the next tool call now using function calling. Do NOT narrate. If you need context, CALL read_file and proceed.'
    : 'Continue with the next pending task in the plan.';

  return { shouldContinue: true, nextInput, interrupted: false, updatedSession };
};

// ─────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────
const showLoopGuardUI = (deps: ConversationHandlerDependencies, restartLoop: (input: string) => Promise<void>) => {
  const { autoLoopGuardRef, setMessages, setIsLoading, setBotStatus } = deps;
  const continueId = `loop-guard-${Date.now()}`;
  setBotStatus(undefined);
  setMessages((prev) => [
    ...prev,
    {
      id: continueId, sender: Sender.Bot, timestamp: Date.now(),
      text: '⚠️ 检测到可能的自动循环：模型连续多次未实际发出工具调用。已暂停自动推进。',
      collapsible: { title: 'Loop Guard', content: `noToolStreak=${autoLoopGuardRef.current.noToolStreak}`, defaultOpen: false },
      actions: [
        { label: 'Retry (force tool call)', variant: 'primary' as const, onAction: async () => { setMessages((p) => p.map((m) => (m.id === continueId ? { ...m, actions: [] } : m))); autoLoopGuardRef.current.noToolStreak = 0; await restartLoop('You MUST execute the next tool call now. Do NOT narrate.'); } },
        { label: 'Continue once', variant: 'secondary' as const, onAction: async () => { setMessages((p) => p.map((m) => (m.id === continueId ? { ...m, actions: [] } : m))); autoLoopGuardRef.current.noToolStreak = 0; await restartLoop('Continue with the next pending task.'); } },
      ],
    },
  ]);
  setIsLoading(false);
};

const showRollbackUI = (deps: ConversationHandlerDependencies, reason: string, session: SessionState, restartLoop: (input: string) => Promise<void>) => {
  const retryId = `rollback-${Date.now()}`;
  deps.setBotStatus(undefined);
  deps.setMessages((prev) => [
    ...prev,
    {
      id: `rollback-info-${Date.now()}`, sender: Sender.Bot, timestamp: Date.now(),
      text: '❌ Quality Gate FAIL — 已回滚到上一个版本。',
      collapsible: { title: 'Rollback Details', content: `reason: ${reason}\n${formatMetrics(session.metrics)}`, defaultOpen: true },
    },
    {
      id: retryId, sender: Sender.Bot, timestamp: Date.now(),
      text: '要重试还是跳过当前任务？',
      actions: [
        { label: 'Retry', variant: 'primary' as const, onAction: async () => { deps.setMessages((p) => p.map((m) => (m.id === retryId ? { ...m, actions: [] } : m))); await restartLoop('The last change was rolled back. Re-attempt the current task with a different approach.'); } },
        { label: 'Skip task', variant: 'secondary' as const, onAction: async () => { deps.setMessages((p) => p.map((m) => (m.id === retryId ? { ...m, actions: [] } : m))); await restartLoop('Skip the current task and move to the next pending task.'); } },
        { label: 'Stop', variant: 'danger' as const, onAction: () => { deps.setMessages((p) => p.map((m) => (m.id === retryId ? { ...m, actions: [] } : m))); deps.setIsLoading(false); } },
      ],
    },
  ]);
  deps.setIsLoading(false);
};

const showSafetyLimitUI = (deps: ConversationHandlerDependencies, restartLoop: (input: string) => Promise<void>) => {
  const continueId = `safety-${Date.now()}`;
  deps.setBotStatus(undefined);
  deps.setMessages((prev) => [
    ...prev,
    {
      id: continueId, sender: Sender.Bot, timestamp: Date.now(),
      text: `⚠️ 已达到安全限制 (${MAX_TURNS} 轮)。点击 Continue 继续。`,
      action: { type: 'continue_execution' as const, label: 'Continue', onAction: async () => { deps.setMessages((p) => p.map((m) => (m.id === continueId ? { ...m, action: undefined } : m))); await restartLoop('Continue with the next pending task.'); } },
    },
  ]);
  deps.setIsLoading(false);
};

// ─────────────────────────────────────────────
// MAIN ENTRY — 7 步 Agent Loop
// ─────────────────────────────────────────────
export const runAgentLoop = async (
  initialInput: string,
  image: { mimeType: string; data: string } | undefined,
  deps: ConversationHandlerDependencies,
  options?: { tryRestore?: boolean },
): Promise<void> => {
  // 重置 loop guard
  deps.autoLoopGuardRef.current.noToolStreak = 0;
  deps.autoLoopGuardRef.current.lastNoToolResponseKey = '';

  if (!deps.geminiServiceRef.current) throw new Error('Gemini service not initialized');
  if (image) deps.referenceImageRef.current = image;

  // ── STEP 1: SESSION ──
  const { session: initSess, restored } = await initSession(deps, initialInput, options?.tryRestore);
  let session = initSess;
  session = updateSessionField(session, 'currentInput', initialInput);

  // If restored, determine resume input from session state
  let nextInput: string | any[] = initialInput;
  let repairAttempts = session.repairAttempts || 0;

  if (restored && session.activeTaskId) {
    const activeTask = (session.tasks || []).find((t) => t.id === session.activeTaskId);
    if (activeTask && session.lastToolResult) {
      nextInput = `Resuming session. Current task: "${activeTask.description}". Last tool result: success=${session.lastToolResult.success}, output="${session.lastToolResult.output.slice(0, 300)}". Continue working on this task.`;
    } else if (activeTask) {
      nextInput = `Resuming session. Continue working on task: "${activeTask.description}"`;
    }
  }

  const restartLoop = async (input: string) => {
    deps.setIsLoading(true);
    await runAgentLoop(input, undefined, deps);
  };

  // ── CORE LOOP ──
  while (session.metrics.totalTurns < MAX_TURNS) {
    session = incrementMetric(session, 'totalTurns');
    const turnCount = session.metrics.totalTurns;

    // Track active task
    const currentActiveTask = (deps.tasksRef.current || []).find((t) => t.status === 'in_progress');
    if (currentActiveTask) {
      session = updateSessionField(session, 'activeTaskId', currentActiveTask.id);
    }

    // Update loop guard phase
    session = updateLoopGuard(session, { phase: 'waiting_model' });

    debugLog('agentLoop.turn', { turnCount, inputType: typeof nextInput === 'string' ? 'text' : 'functionResponse' });

    // ── STEP 2: FEEDFORWARD ──
    const enrichedPayload = await buildFeedforwardPayload(nextInput, deps, turnCount, session);

    // 创建 bot message
    if (turnCount === 1 && !restored) {
      deps.setMessages((prev) => [
        ...prev,
        { id: `bot-${Date.now()}`, sender: Sender.Bot, text: '', timestamp: Date.now(), isStreaming: true, statusText: 'Thinking...' },
      ]);
    } else {
      deps.setBotStatus('Processing...');
    }

    try {
      // ── STEP 3: MODEL ──
      const { fullResponseText, functionCallData } = await callModelAndStream(enrichedPayload, deps);

      // 无 tool_call → STEP 7: CONTINUATION
      if (!functionCallData) {
        session = updateLoopGuard(session, { phase: 'idle' });
        const contResult = evaluateContinuation(fullResponseText, deps, session);
        if (contResult.updatedSession) session = contResult.updatedSession;
        if (contResult.interrupted) {
          session = updateLoopGuard(session, { phase: 'awaiting_user' });
          await persistSession(session);
          showLoopGuardUI(deps, restartLoop);
          return;
        }
        if (!contResult.shouldContinue) {
          await persistSession(session);
          return;
        }
        nextInput = contResult.nextInput;
        continue;
      }

      // ── STEP 4: EXECUTE ──
      session = updateLoopGuard(session, { phase: 'waiting_tool', noToolStreak: 0 });
      deps.autoLoopGuardRef.current.noToolStreak = 0;
      session = incrementMetric(session, 'toolCalls');

      // Save last tool call to session
      session = updateSessionField(session, 'lastToolCall', {
        name: String(functionCallData.name || ''),
        args: functionCallData.args,
      });

      // 记录执行前的文件内容 (用于 Feedback)
      const beforeContent = deps.getActiveFile().content;

      // 通过 Promise 桥接 handleToolCallFlow 的回调
      let toolFlowResolved = false;
      const toolResultPromise = new Promise<{ nextInput: string | any[]; done: boolean }>((resolve) => {
        handleToolCallFlow(functionCallData, turnCount, deps, async (toolNextInput) => {
          toolFlowResolved = true;
          resolve({ nextInput: toolNextInput, done: false });
        }).then(() => {
          if (!toolFlowResolved) resolve({ nextInput: '', done: true });
        });
      });

      const toolResult = await toolResultPromise;

      // Save actual tool result to session (deposited by toolCallFlow via lastToolResultRef)
      const captured = deps.lastToolResultRef?.current;
      if (captured) {
        session = updateSessionField(session, 'lastToolResult', {
          success: captured.success,
          output: captured.output,
        });
      }

      if (toolResult.done) {
        // UI 中断 (diff confirmation, validation block, etc.)
        session = updateLoopGuard(session, { phase: 'awaiting_user' });
        await persistSession(session);
        return;
      }

      // ── STEP 5: FEEDBACK (仅对破坏性工具) ──
      const afterContent = deps.getActiveFile().content;
      const toolName = String(functionCallData.name || '');
      const isDestructive = toolName === 'modify_code' || toolName === 'insert_content';

      if (isDestructive && afterContent !== beforeContent) {
        const feedback = evaluateAfterExecution({
          beforeContent,
          afterContent,
          toolName,
          toolResult: { success: true, output: '' },
          pageWidth: deps.pageWidth,
          pageHeight: deps.pageHeight,
          hasPendingTasks: (deps.tasksRef.current || []).some((t) => t.status === 'pending'),
        });

        debugLog('agentLoop.feedback', { score: feedback.score, issues: feedback.issues.length });

        // ── STEP 6: QUALITY GATE (dual-layer) ──
        // Layer 2: Goal evaluation
        const goalResult = evaluateGoal({
          currentTask: currentActiveTask,
          fileFeedback: feedback,
          allTasks: deps.tasksRef.current || [],
          fileContent: afterContent,
          repairAttempts,
        });

        const decision = decide(feedback, repairAttempts, goalResult);

        if (decision.action === 'pass_and_advance') {
          // ✅ Pass + advance — Checkpoint
          session = saveCheckpoint(session, afterContent, deps.tasksRef.current || [], turnCount);
          session = updateSessionField(session, 'repairAttempts', 0);
          repairAttempts = 0;

          deps.setMessages((prev) => {
            const lastIdx = prev.length - 1;
            const last = prev[lastIdx];
            if (last && last.sender === Sender.Bot) {
              return prev.map((m, i) => i === lastIdx ? { ...m, collapsible: m.collapsible || { title: `✅ Quality: ${feedback.score}/10`, content: formatMetrics(session.metrics), defaultOpen: false } } : m);
            }
            return prev;
          });

          await persistSession(session);

        } else if (decision.action === 'continue_current_task') {
          // File OK but task not complete — checkpoint but keep working
          session = saveCheckpoint(session, afterContent, deps.tasksRef.current || [], turnCount);
          repairAttempts = 0;
          session = updateSessionField(session, 'repairAttempts', 0);

          deps.setMessages((prev) => {
            const lastIdx = prev.length - 1;
            const last = prev[lastIdx];
            if (last && last.sender === Sender.Bot) {
              return prev.map((m, i) => i === lastIdx ? { ...m, collapsible: m.collapsible || { title: `✅ File OK (${feedback.score}/10) — task continuing`, content: `${decision.reason}\n${formatMetrics(session.metrics)}`, defaultOpen: false } } : m);
            }
            return prev;
          });

        } else if (decision.action === 'fix') {
          // ⚠️ Fix — 自动修复，回到 Model
          repairAttempts = decision.attempt;
          session = updateSessionField(session, 'repairAttempts', repairAttempts);
          session = incrementMetric(session, 'repairAttempts');
          session = updateLoopGuard(session, { phase: 'repairing' });

          deps.setMessages((prev) => [
            ...prev,
            {
              id: `fix-${Date.now()}`, sender: Sender.Bot, timestamp: Date.now(),
              text: `⚠️ Quality Gate: ${feedback.score}/10 — 自动修复中 (attempt ${repairAttempts}/2)...`,
              collapsible: { title: 'Issues', content: feedback.issues.join('\n'), defaultOpen: false },
            },
          ]);

          nextInput = decision.repairPrompt;
          continue; // 回到 STEP 2 (Fix → Model)

        } else {
          // ❌ Rollback
          session = incrementMetric(session, 'rollbacks');

          // Try checkpoint restore first, fall back to undo_last
          const latestCp = session.checkpoints[session.checkpoints.length - 1];
          if (latestCp) {
            deps.updateFileContent(latestCp.fileContent, 'Rollback to checkpoint');
            deps.setTasks(latestCp.tasks);
            debugLog('agentLoop.rollback.checkpoint', { cpId: latestCp.id });
          } else {
            const undoTool = getToolByName('undo_last');
            if (undoTool) {
              await undoTool.call({}, {
                getActiveFile: deps.getActiveFile,
                getAllFiles: deps.getAllFiles,
                updateFileContent: deps.updateFileContent,
                revertToLatestHistory: deps.revertToLatestHistory,
                tasksRef: deps.tasksRef,
                setTasks: deps.setTasks,
              });
            }
          }

          session = updateLoopGuard(session, { phase: 'awaiting_user' });
          await persistSession(session);
          showRollbackUI(deps, decision.reason, session, restartLoop);
          return;
        }
      }

      session = updateLoopGuard(session, { phase: 'idle' });

      // 继续下一轮
      nextInput = toolResult.nextInput;

    } catch (error: any) {
      session = incrementMetric(session, 'errors');
      console.error(error);
      debugLog('agentLoop.error', { turnCount, message: error?.message });

      const isRetryable = error?.code === 429 || error?.code === 503;
      if (isRetryable && session.metrics.errors < 3) {
        deps.setMessages((prev) => [
          ...prev,
          { id: `retry-${Date.now()}`, sender: Sender.Bot, text: `⚠️ API error (${error?.code}), retrying...`, timestamp: Date.now() },
        ]);
        await new Promise((r) => setTimeout(r, 2000));
        continue; // 重试
      }

      const msg = error?.message?.includes('API Key')
        ? 'API Key Error. Please check settings.'
        : `Error: ${error?.message || 'Unknown error'}`;
      deps.setBotStatus(undefined);
      deps.setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, sender: Sender.Bot, text: msg, timestamp: Date.now() },
      ]);
      await persistSession(session);
      deps.setIsLoading(false);
      return;
    }
  }

  // 超过 MAX_TURNS — persist before showing UI
  await persistSession(session);
  showSafetyLimitUI(deps, restartLoop);
};
