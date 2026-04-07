/**
 * Context Engineer — 上下文工程层 (v2: real prompt assembly)
 *
 * 按任务类型动态裁剪上下文，真正参与 prompt 组装。
 * buildContextPayload() 是统一入口，决定注入什么、裁剪多少。
 */
import type { AgentTask } from '../../types';
import { validatePrintSafe } from '../../utils/printSafeValidator';
import { validateStrictHtmlTables } from '../../utils/strictHtmlTableValidator';
import { debugLog } from '../../utils/debug';

export type TaskType = 'create' | 'fix' | 'style' | 'structure' | 'general';

/**
 * 从任务描述推断任务类型
 */
export const inferTaskType = (task: AgentTask | undefined): TaskType => {
  if (!task) return 'general';
  const desc = String(task.description || '').toLowerCase();

  if (/create|generate|build|make|new|template|from scratch/i.test(desc)) return 'create';
  if (/fix|repair|error|bug|broken|issue|correct|validation/i.test(desc)) return 'fix';
  if (/style|color|font|spacing|align|padding|margin|border|background|visual/i.test(desc)) return 'style';
  if (/structure|table|column|row|header|footer|section|layout|colgroup/i.test(desc)) return 'structure';

  return 'general';
};

/**
 * 获取当前 in_progress 任务
 */
export const getCurrentTask = (tasks: AgentTask[]): AgentTask | undefined =>
  tasks.find((t) => t.status === 'in_progress');

/**
 * 根据任务类型决定上下文裁剪策略
 */
export interface ContextStrategy {
  maxFileContextChars: number;
  includeTemplate: boolean;
  includePrintSafePrecheck: boolean;
  includeHtmlValidation: boolean;
  includeVisionHint: boolean;
  maxPlanContextChars: number;
  includeValidatorResults: boolean;
  includePreviewContext: boolean;
}

export const getContextStrategy = (taskType: TaskType): ContextStrategy => {
  switch (taskType) {
    case 'create':
      return {
        maxFileContextChars: 6000,
        includeTemplate: true,
        includePrintSafePrecheck: false,
        includeHtmlValidation: false,
        includeVisionHint: true,
        maxPlanContextChars: 2200,
        includeValidatorResults: false,
        includePreviewContext: false,
      };
    case 'fix':
      return {
        maxFileContextChars: 14000,
        includeTemplate: false,
        includePrintSafePrecheck: true,
        includeHtmlValidation: true,
        includeVisionHint: false,
        maxPlanContextChars: 1500,
        includeValidatorResults: true,
        includePreviewContext: false,
      };
    case 'style':
      return {
        maxFileContextChars: 10000,
        includeTemplate: false,
        includePrintSafePrecheck: false,
        includeHtmlValidation: false,
        includeVisionHint: true,
        maxPlanContextChars: 1200,
        includeValidatorResults: false,
        includePreviewContext: true,
      };
    case 'structure':
      return {
        maxFileContextChars: 14000,
        includeTemplate: true,
        includePrintSafePrecheck: true,
        includeHtmlValidation: true,
        includeVisionHint: false,
        maxPlanContextChars: 2000,
        includeValidatorResults: true,
        includePreviewContext: false,
      };
    default:
      return {
        maxFileContextChars: 14000,
        includeTemplate: true,
        includePrintSafePrecheck: true,
        includeHtmlValidation: true,
        includeVisionHint: true,
        maxPlanContextChars: 2200,
        includeValidatorResults: true,
        includePreviewContext: true,
      };
  }
};

// ─── Context Payload Builder ─────────────────────────

export interface ContextPayloadParams {
  /** Current file content */
  fileContent: string;
  /** All tasks in the plan */
  tasks: AgentTask[];
  /** Page dimensions for validation */
  pageWidth: string;
  pageHeight: string;
  /** Whether preview image is available */
  hasPreviewImage: boolean;
  /** Whether reference image is available */
  hasReferenceImage: boolean;
  /** Last validator results (if any) */
  lastValidatorIssues?: string[];
  /** Last tool result (for context injection) */
  lastToolResult?: { success: boolean; output: string };
}

export interface ContextPayload {
  /** Assembled context string to inject into prompt */
  contextBlock: string;
  /** Strategy used (for debug logging) */
  strategy: ContextStrategy;
  /** Task type inferred */
  taskType: TaskType;
  /** Sources included */
  includedSources: string[];
  /** Total chars in context */
  promptChars: number;
}

/**
 * Build the full context payload for the current turn.
 * This is the unified entry point that replaces the old pattern
 * where contextEngineer returned strategies that were never used.
 */
export const buildContextPayload = (params: ContextPayloadParams): ContextPayload => {
  const { fileContent, tasks, pageWidth, pageHeight, hasPreviewImage, hasReferenceImage, lastValidatorIssues, lastToolResult } = params;

  const currentTask = getCurrentTask(tasks);
  const taskType = inferTaskType(currentTask);
  const strategy = getContextStrategy(taskType);
  const includedSources: string[] = [];
  const parts: string[] = [];

  parts.push('[CONTEXT_PAYLOAD]');
  parts.push(`taskType: ${taskType}`);

  // ── Current task + dependencies ──
  if (currentTask) {
    parts.push(`\n[CURRENT_TASK]`);
    parts.push(`id: ${currentTask.id}`);
    parts.push(`description: ${currentTask.description}`);
    if (currentTask.acceptanceCriteria && currentTask.acceptanceCriteria.length > 0) {
      parts.push(`acceptanceCriteria:`);
      currentTask.acceptanceCriteria.forEach((c) => parts.push(`  - ${c}`));
    }
    if (currentTask.blockedBy && currentTask.blockedBy.length > 0) {
      parts.push(`blockedBy: ${currentTask.blockedBy.join(', ')}`);
    }
    includedSources.push('currentTask');

    // Include dependency context (only deps and recent failures)
    const depIds = new Set([...(currentTask.dependsOn || []), ...(currentTask.blockedBy || [])]);
    if (depIds.size > 0) {
      const depTasks = tasks.filter((t) => depIds.has(t.id));
      if (depTasks.length > 0) {
        parts.push(`\n[DEPENDENCIES]`);
        depTasks.forEach((t) => {
          parts.push(`- ${t.id}: ${t.status} — ${t.description.slice(0, 100)}`);
        });
        includedSources.push('dependencies');
      }
    }

    // Include recent failures
    const failedTasks = tasks.filter((t) => t.status === 'failed').slice(-2);
    if (failedTasks.length > 0) {
      parts.push(`\n[RECENT_FAILURES]`);
      failedTasks.forEach((t) => {
        parts.push(`- ${t.id}: ${t.description.slice(0, 150)}`);
      });
      includedSources.push('recentFailures');
    }
  }

  // ── Plan summary (trimmed) ──
  const planSummary = buildPlanSummary(tasks, strategy.maxPlanContextChars);
  if (planSummary) {
    parts.push(`\n[PLAN_SUMMARY]`);
    parts.push(planSummary);
    includedSources.push('planSummary');
  }

  // ── File context (clipped by strategy) ──
  if (fileContent && fileContent.trim()) {
    const clipped = fileContent.length > strategy.maxFileContextChars
      ? fileContent.slice(0, strategy.maxFileContextChars) + '\n... (truncated)'
      : fileContent;
    parts.push(`\n[FILE_CONTEXT] (${fileContent.length} chars, showing ${Math.min(fileContent.length, strategy.maxFileContextChars)})`);
    parts.push(clipped);
    includedSources.push('fileContext');
  }

  // ── Validator results ──
  if (strategy.includeValidatorResults && lastValidatorIssues && lastValidatorIssues.length > 0) {
    parts.push(`\n[LAST_VALIDATOR_ISSUES]`);
    lastValidatorIssues.slice(0, 10).forEach((issue) => parts.push(`- ${issue}`));
    includedSources.push('validatorResults');
  }

  // ── PrintSafe precheck ──
  if (strategy.includePrintSafePrecheck && fileContent.trim()) {
    const issues = validatePrintSafe(fileContent, {
      pageWidth, pageHeight, maxIssues: 8,
      requirePrintformjs: !tasks.some((t) => t.status === 'pending' || t.status === 'in_progress'),
      requireThreePageTest: false,
      minProwitemCount: 1,
    });
    if (issues.length > 0) {
      parts.push(`\n[PRINTSAFE_PRECHECK]`);
      issues.slice(0, 6).forEach((i) => parts.push(`- [${i.level.toUpperCase()}] ${i.code}: ${i.message}`));
      includedSources.push('printSafePrecheck');
    }
  }

  // ── HTML validation ──
  if (strategy.includeHtmlValidation && fileContent.trim()) {
    const htmlIssues = validateStrictHtmlTables(fileContent, {
      maxIssues: 8,
      allowTrDirectlyUnderTable: true,
      allowTableFragmentsInTemplate: true,
    });
    if (htmlIssues.length > 0) {
      parts.push(`\n[HTML_VALIDATION]`);
      (htmlIssues as any[]).slice(0, 5).forEach((i: any) =>
        parts.push(`- [${String(i.level).toUpperCase()}] ${i.code}: ${i.message}`));
      includedSources.push('htmlValidation');
    }
  }

  // ── Preview context ──
  if (strategy.includePreviewContext && hasPreviewImage) {
    parts.push(`\n[PREVIEW] Preview snapshot available for visual comparison.`);
    includedSources.push('previewImage');
  }

  // ── Vision hint ──
  if (strategy.includeVisionHint && hasReferenceImage) {
    parts.push(`\n[VISION] Reference image provided. Compare with preview before editing.`);
    includedSources.push('visionHint');
  }

  // ── Last tool result ──
  if (lastToolResult) {
    parts.push(`\n[LAST_TOOL_RESULT] success=${lastToolResult.success}`);
    parts.push(lastToolResult.output.slice(0, 500));
    includedSources.push('lastToolResult');
  }

  parts.push('[/CONTEXT_PAYLOAD]');

  const contextBlock = parts.join('\n');

  debugLog('contextEngineer.payload', {
    taskType,
    strategy: {
      maxFileContextChars: strategy.maxFileContextChars,
      includeTemplate: strategy.includeTemplate,
      includePrintSafePrecheck: strategy.includePrintSafePrecheck,
    },
    includedSources,
    promptChars: contextBlock.length,
  });

  return {
    contextBlock,
    strategy,
    taskType,
    includedSources,
    promptChars: contextBlock.length,
  };
};

/**
 * Build a compact plan summary: current task, pending count, recent completions
 */
const buildPlanSummary = (tasks: AgentTask[], maxChars: number): string | null => {
  if (tasks.length === 0) return null;

  const lines: string[] = [];
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const pending = tasks.filter((t) => t.status === 'pending').length;
  const failed = tasks.filter((t) => t.status === 'failed').length;
  const inProgress = tasks.find((t) => t.status === 'in_progress');

  lines.push(`Progress: ${completed}/${tasks.length} done, ${pending} pending, ${failed} failed`);

  if (inProgress) {
    lines.push(`Current: [${inProgress.id}] ${inProgress.description.slice(0, 120)}`);
  }

  // Show pending tasks briefly
  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  if (pendingTasks.length > 0) {
    lines.push('Upcoming:');
    pendingTasks.slice(0, 5).forEach((t, i) => {
      lines.push(`  ${i + 1}. ${t.description.slice(0, 80)}`);
    });
    if (pendingTasks.length > 5) {
      lines.push(`  ... and ${pendingTasks.length - 5} more`);
    }
  }

  const result = lines.join('\n');
  return result.length > maxChars ? result.slice(0, maxChars) + '\n...' : result;
};
