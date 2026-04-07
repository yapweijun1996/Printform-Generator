/**
 * Goal Evaluator — 目标级评估器
 *
 * 在文件级 feedbackController 之上，评估当前任务是否真正完成。
 * 检查 acceptance criteria、blockers、preview 预期。
 * 输出推荐动作: continue_current_task | advance_plan | rollback
 */
import type { AgentTask } from '../../types';
import type { FeedbackResult } from './feedbackController';
import { debugLog } from '../../utils/debug';

export interface GoalEvaluatorResult {
  /** Whether the current task's goal is satisfied */
  goalSatisfied: boolean;
  /** Remaining gaps preventing completion */
  remainingGaps: string[];
  /** Confidence 0-1 that the task is done */
  confidence: number;
  /** Recommended next action */
  recommendedNextAction: 'continue_current_task' | 'advance_plan' | 'rollback';
}

export interface GoalEvaluatorParams {
  /** The current in-progress task */
  currentTask: AgentTask | undefined;
  /** File-level feedback result */
  fileFeedback: FeedbackResult;
  /** All tasks in the plan */
  allTasks: AgentTask[];
  /** Current file content */
  fileContent: string;
  /** Number of repair attempts so far */
  repairAttempts: number;
}

/**
 * Evaluate whether the current task's goal is satisfied
 */
export const evaluateGoal = (params: GoalEvaluatorParams): GoalEvaluatorResult => {
  const { currentTask, fileFeedback, allTasks, fileContent, repairAttempts } = params;

  // No current task → nothing to evaluate
  if (!currentTask) {
    return {
      goalSatisfied: true,
      remainingGaps: [],
      confidence: 1,
      recommendedNextAction: 'advance_plan',
    };
  }

  const gaps: string[] = [];
  let confidence = 1;

  // ── Check file-level feedback ──
  if (fileFeedback.score < 8) {
    gaps.push(`File quality score ${fileFeedback.score}/10 (need ≥8)`);
    confidence *= 0.3;

    // Too many repair attempts → rollback
    if (repairAttempts >= 2) {
      debugLog('goalEvaluator.rollback', { reason: 'max repairs exceeded', score: fileFeedback.score });
      return {
        goalSatisfied: false,
        remainingGaps: gaps,
        confidence: 0,
        recommendedNextAction: 'rollback',
      };
    }

    return {
      goalSatisfied: false,
      remainingGaps: gaps,
      confidence,
      recommendedNextAction: 'continue_current_task',
    };
  }

  // ── Check acceptance criteria ──
  const criteria = currentTask.acceptanceCriteria || [];
  if (criteria.length > 0) {
    const contentLower = fileContent.toLowerCase();

    for (const criterion of criteria) {
      const criterionLower = criterion.toLowerCase();

      // Extract structural keywords and check if they appear in the file content.
      // Only check file content — NOT task description, which would cause false positives
      // (keywords in the criterion that are also in the description would always match).
      const structuralKeywords = extractKeywords(criterionLower);

      // Require a majority of keywords to match, not just one
      const matchCount = structuralKeywords.filter((kw) => contentLower.includes(kw)).length;
      const likelyMet = structuralKeywords.length > 0 && matchCount >= Math.ceil(structuralKeywords.length * 0.6);

      if (!likelyMet) {
        gaps.push(`Acceptance criterion not met: "${criterion}"`);
        confidence *= 0.5;
      }
    }
  }

  // ── Check blockers ──
  const blockedBy = currentTask.blockedBy || [];
  if (blockedBy.length > 0) {
    const unblockedIds = new Set(
      allTasks.filter((t) => t.status === 'completed').map((t) => t.id),
    );
    const stillBlocked = blockedBy.filter((id) => !unblockedIds.has(id));
    if (stillBlocked.length > 0) {
      gaps.push(`Blocked by tasks: ${stillBlocked.join(', ')}`);
      confidence *= 0.1;
    }
  }

  // ── Check dependencies ──
  const dependsOn = currentTask.dependsOn || [];
  if (dependsOn.length > 0) {
    const completedIds = new Set(
      allTasks.filter((t) => t.status === 'completed').map((t) => t.id),
    );
    const unmetDeps = dependsOn.filter((id) => !completedIds.has(id));
    if (unmetDeps.length > 0) {
      gaps.push(`Unmet dependencies: ${unmetDeps.join(', ')}`);
      confidence *= 0.1;
    }
  }

  const goalSatisfied = gaps.length === 0;

  debugLog('goalEvaluator.result', {
    taskId: currentTask.id,
    goalSatisfied,
    gaps: gaps.length,
    confidence,
  });

  return {
    goalSatisfied,
    remainingGaps: gaps,
    confidence,
    recommendedNextAction: goalSatisfied ? 'advance_plan' : 'continue_current_task',
  };
};

/**
 * Extract meaningful keywords from a criterion string for heuristic matching
 */
const extractKeywords = (criterion: string): string[] => {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can',
    'need', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
    'from', 'as', 'into', 'through', 'and', 'or', 'but', 'not',
    'that', 'this', 'it', 'all', 'each', 'every', 'both',
  ]);

  return criterion
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9_-]/g, ''))
    .filter((w) => w.length > 2 && !stopWords.has(w));
};
