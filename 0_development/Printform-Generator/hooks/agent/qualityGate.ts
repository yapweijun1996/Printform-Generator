/**
 * Quality Gate — 质量门禁 (v2: dual-layer)
 *
 * 双层决策：
 * 1. 文件级: feedbackController score → fix / rollback
 * 2. 目标级: goalEvaluator → continue_current_task / pass_and_advance
 *
 * Decisions:
 * - pass_and_advance: file OK + goal satisfied → checkpoint + advance plan
 * - continue_current_task: file OK but goal not satisfied → keep working
 * - fix: file score 4~7 → auto-repair
 * - rollback: file score <4 → undo + user intervention
 */
import type { FeedbackResult } from './feedbackController';
import type { GoalEvaluatorResult } from './goalEvaluator';

export type GateDecision =
  | { action: 'pass_and_advance' }
  | { action: 'continue_current_task'; reason: string }
  | { action: 'fix'; repairPrompt: string; attempt: number }
  | { action: 'rollback'; reason: string };

const PASS_THRESHOLD = 8;
const FIX_THRESHOLD = 4;
const MAX_REPAIR_ATTEMPTS = 2;

/**
 * Dual-layer quality decision
 */
export const decide = (
  feedback: FeedbackResult,
  repairAttempts: number,
  goalResult?: GoalEvaluatorResult,
): GateDecision => {
  // ── Layer 1: File-level checks ──
  if (feedback.score < FIX_THRESHOLD || (feedback.score < PASS_THRESHOLD && repairAttempts >= MAX_REPAIR_ATTEMPTS)) {
    return {
      action: 'rollback',
      reason: feedback.issues.length > 0
        ? feedback.issues.join('; ')
        : `Quality score too low: ${feedback.score}/10`,
    };
  }

  if (feedback.score < PASS_THRESHOLD && repairAttempts < MAX_REPAIR_ATTEMPTS) {
    return {
      action: 'fix',
      repairPrompt: buildRepairPrompt(feedback),
      attempt: repairAttempts + 1,
    };
  }

  // ── Layer 2: Goal-level checks (file passed) ──
  if (goalResult && !goalResult.goalSatisfied) {
    if (goalResult.recommendedNextAction === 'rollback') {
      return {
        action: 'rollback',
        reason: goalResult.remainingGaps.join('; '),
      };
    }

    return {
      action: 'continue_current_task',
      reason: goalResult.remainingGaps.length > 0
        ? goalResult.remainingGaps.join('; ')
        : 'Task acceptance criteria not yet met',
    };
  }

  // ── Both layers pass ──
  return { action: 'pass_and_advance' };
};

/**
 * Build structured repair prompt from feedback issues
 */
const buildRepairPrompt = (feedback: FeedbackResult): string => {
  const parts: string[] = [
    `[QUALITY GATE] Score: ${feedback.score}/10 — auto-repair required.`,
    `PrintSafe: ${feedback.printSafeScore}/10 | HTML: ${feedback.htmlValidScore}/10 | Diff reasonable: ${feedback.diffReasonable}`,
    '',
    'Issues to fix:',
  ];

  for (const issue of feedback.issues) {
    parts.push(`- ${issue}`);
  }

  parts.push('');
  parts.push('Fix these issues NOW. Do NOT proceed to the next task until all issues are resolved.');
  parts.push('Use modify_code with operation="replace" to fix specific problems, or operation="rewrite" if the structure is fundamentally broken.');

  return parts.join('\n');
};

/** Export thresholds for external use */
export { PASS_THRESHOLD, FIX_THRESHOLD, MAX_REPAIR_ATTEMPTS };
