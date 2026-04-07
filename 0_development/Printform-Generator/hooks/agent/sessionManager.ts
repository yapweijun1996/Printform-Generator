/**
 * Session Manager — 会话管理器 (v2: Persistent Runtime)
 *
 * 管理 Agent Loop 的会话生命周期：
 * - IndexedDB 持久化 + 恢复
 * - Checkpoint 保存/恢复 (含任务状态 + 执行上下文)
 * - 会话统计
 * - Loop Guard 状态
 */
import type { AgentTask } from '../../types';
import { idbGet, idbSet, idbDel } from '../../utils/indexedDb';

// ─── Types ───────────────────────────────────────────

export interface Checkpoint {
  id: string;
  timestamp: number;
  fileContent: string;
  tasks: AgentTask[];
  turnCount: number;
}

export interface SessionMetrics {
  totalTurns: number;
  toolCalls: number;
  errors: number;
  rollbacks: number;
  repairAttempts: number;
}

/** Loop guard state machine states */
export type LoopGuardPhase =
  | 'idle'
  | 'waiting_model'
  | 'waiting_tool'
  | 'repairing'
  | 'blocked'
  | 'awaiting_user';

export interface LoopGuardState {
  phase: LoopGuardPhase;
  noToolStreak: number;
  lastNoToolResponseKey: string;
}

export interface SessionState {
  sessionId: string;
  startedAt: number;
  tasks: AgentTask[];
  checkpoints: Checkpoint[];
  metrics: SessionMetrics;

  // ── v2 additions ──
  /** The user's original input that started this session */
  currentInput: string;
  /** Currently active task ID */
  activeTaskId: string | undefined;
  /** Current repair attempt count (reset on pass) */
  repairAttempts: number;
  /** Loop guard state machine */
  loopGuardState: LoopGuardState;
  /** Last tool call name + args (for resume) */
  lastToolCall: { name: string; args: any } | undefined;
  /** Last tool result (for resume / context injection) */
  lastToolResult: { success: boolean; output: string } | undefined;
  /** ID of the most recent checkpoint (for quick lookup) */
  lastCheckpointId: string | undefined;
  /** Whether session has been persisted at least once */
  persisted: boolean;
}

// ─── IndexedDB Keys ──────────────────────────────────

const SESSION_KEY = 'agent_session_v2';

// ─── Create ──────────────────────────────────────────

export const createSession = (initialInput: string = ''): SessionState => ({
  sessionId: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  startedAt: Date.now(),
  tasks: [],
  checkpoints: [],
  metrics: {
    totalTurns: 0,
    toolCalls: 0,
    errors: 0,
    rollbacks: 0,
    repairAttempts: 0,
  },
  currentInput: initialInput,
  activeTaskId: undefined,
  repairAttempts: 0,
  loopGuardState: {
    phase: 'idle',
    noToolStreak: 0,
    lastNoToolResponseKey: '',
  },
  lastToolCall: undefined,
  lastToolResult: undefined,
  lastCheckpointId: undefined,
  persisted: false,
});

// ─── Checkpoint ──────────────────────────────────────

/**
 * Save checkpoint: file content + task state + execution context
 */
export const saveCheckpoint = (
  session: SessionState,
  fileContent: string,
  tasks: AgentTask[],
  turnCount: number,
): SessionState => {
  const checkpoint: Checkpoint = {
    id: `cp-${Date.now()}`,
    timestamp: Date.now(),
    fileContent,
    tasks: tasks.map((t) => ({ ...t })),
    turnCount,
  };

  const checkpoints = [...session.checkpoints, checkpoint].slice(-10);

  return {
    ...session,
    checkpoints,
    tasks,
    lastCheckpointId: checkpoint.id,
  };
};

export const getLatestCheckpoint = (session: SessionState): Checkpoint | undefined =>
  session.checkpoints[session.checkpoints.length - 1];

// ─── Metrics ─────────────────────────────────────────

export const incrementMetric = (
  session: SessionState,
  key: keyof SessionMetrics,
  amount: number = 1,
): SessionState => ({
  ...session,
  metrics: {
    ...session.metrics,
    [key]: session.metrics[key] + amount,
  },
});

export const formatMetrics = (metrics: SessionMetrics): string =>
  `turns=${metrics.totalTurns} tools=${metrics.toolCalls} errors=${metrics.errors} rollbacks=${metrics.rollbacks} repairs=${metrics.repairAttempts}`;

// ─── Session Update Helpers ──────────────────────────

export const updateSessionField = <K extends keyof SessionState>(
  session: SessionState,
  key: K,
  value: SessionState[K],
): SessionState => ({
  ...session,
  [key]: value,
});

export const updateLoopGuard = (
  session: SessionState,
  update: Partial<LoopGuardState>,
): SessionState => ({
  ...session,
  loopGuardState: { ...session.loopGuardState, ...update },
});

// ─── Persistence (IndexedDB) ─────────────────────────

/** Serialize session to a persistence-safe shape (strip non-serializable data) */
const toPersistedSession = (session: SessionState): SessionState => ({
  ...session,
  persisted: true,
});

/** Persist current session to IndexedDB */
export const persistSession = async (session: SessionState): Promise<boolean> => {
  try {
    return await idbSet(SESSION_KEY, toPersistedSession(session));
  } catch {
    return false;
  }
};

/** Load the most recent session from IndexedDB */
export const loadPersistedSession = async (): Promise<SessionState | undefined> => {
  try {
    const session = await idbGet<SessionState>(SESSION_KEY);
    if (!session || !session.sessionId) return undefined;
    return session;
  } catch {
    return undefined;
  }
};

/** Clear persisted session */
export const clearPersistedSession = async (): Promise<boolean> => {
  try {
    return await idbDel(SESSION_KEY);
  } catch {
    return false;
  }
};

/** Check if a persisted session exists and is recent (within 2 hours) */
export const hasRecoverableSession = async (): Promise<boolean> => {
  const session = await loadPersistedSession();
  if (!session) return false;
  const twoHoursMs = 2 * 60 * 60 * 1000;
  return Date.now() - session.startedAt < twoHoursMs;
};
