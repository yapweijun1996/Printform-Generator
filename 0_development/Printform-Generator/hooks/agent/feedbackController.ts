/**
 * Feedback Controller — 后验控制层
 *
 * 工具执行后**立即**运行，评估执行质量。
 * 4 个 Sensor：PrintSafe / HTML 结构 / Diff 合理性 / 内容完整性
 *
 * 输出 FeedbackResult (0-10 评分 + issues 列表)
 * 供 Quality Gate 做 Pass/Fix/Rollback 决策。
 */
import { validatePrintSafe } from '../../utils/printSafeValidator';
import { validateStrictHtmlTables } from '../../utils/strictHtmlTableValidator';
import type { ToolResult } from './Tool';

export interface FeedbackResult {
  /** 综合评分 0-10 */
  score: number;
  /** PrintSafe 子分 0-10 */
  printSafeScore: number;
  /** HTML 结构子分 0-10 */
  htmlValidScore: number;
  /** Diff 大小是否合理 */
  diffReasonable: boolean;
  /** 具体问题列表 */
  issues: string[];
}

export interface FeedbackParams {
  beforeContent: string;
  afterContent: string;
  toolName: string;
  toolResult: ToolResult;
  pageWidth: string;
  pageHeight: string;
  hasPendingTasks: boolean;
}

/** 仅对破坏性工具 (modify_code, insert_content) 进行完整评估 */
const DESTRUCTIVE_TOOLS = new Set(['modify_code', 'insert_content']);

/**
 * 执行后立即评估
 * 对只读工具直接返回满分，不浪费计算。
 */
export const evaluateAfterExecution = (params: FeedbackParams): FeedbackResult => {
  const { beforeContent, afterContent, toolName, toolResult, pageWidth, pageHeight, hasPendingTasks } = params;

  // 只读工具 / 执行失败 → 跳过评估
  if (!DESTRUCTIVE_TOOLS.has(toolName) || !toolResult.success) {
    return { score: 10, printSafeScore: 10, htmlValidScore: 10, diffReasonable: true, issues: [] };
  }

  const issues: string[] = [];
  let score = 10;

  // ── Sensor 1: PrintSafe 校验 ──
  const printSafeIssues = validatePrintSafe(afterContent, {
    pageWidth,
    pageHeight,
    maxIssues: 20,
    // 中间步骤不强制完整结构
    requirePrintformjs: !hasPendingTasks,
    requireThreePageTest: false,
    minProwitemCount: hasPendingTasks ? 1 : 20,
  });
  const printSafeErrors = printSafeIssues.filter((i) => i.level === 'error');
  const printSafeDeduction = Math.min(10, printSafeErrors.length * 2);
  score -= printSafeDeduction;
  if (printSafeErrors.length > 0) {
    issues.push(...printSafeErrors.slice(0, 5).map((e) => `[PrintSafe] ${e.code}: ${e.message}`));
  }

  // ── Sensor 2: HTML 结构校验 ──
  const htmlIssues = validateStrictHtmlTables(afterContent, {
    maxIssues: 15,
    allowTrDirectlyUnderTable: true,
    allowTableFragmentsInTemplate: true,
  });
  const htmlErrors = htmlIssues.filter((i) => i.level === 'error');
  const htmlDeduction = Math.min(5, Math.ceil(htmlErrors.length * 1.5));
  score -= htmlDeduction;
  if (htmlErrors.length > 0) {
    issues.push(...htmlErrors.slice(0, 3).map((e) => `[HTML] ${e.code}: ${e.message}`));
  }

  // ── Sensor 3: Diff 合理性 ──
  const beforeLen = beforeContent.length;
  const afterLen = afterContent.length;
  const diffSize = Math.abs(afterLen - beforeLen);

  // 空文件→首次写入不算异常
  if (beforeLen > 100 && diffSize > beforeLen * 0.8) {
    issues.push(`Diff too large: ${diffSize} chars changed (${Math.round((diffSize / beforeLen) * 100)}% of file)`);
    score -= 3;
  }

  // ── Sensor 4: 列数一致性 ──
  const countColsIn = (html: string, cls: string): number => {
    const match = new RegExp(`<table\\b[^>]*class=["'][^"']*\\b${cls}\\b[^"']*["'][^>]*>`, 'i').exec(html);
    if (!match) return 0;
    const block = html.slice(match.index, Math.min(html.length, match.index + 2500));
    return (block.match(/<col\b/gi) || []).length;
  };
  const headerCols = countColsIn(afterContent, 'prowheader');
  const itemCols = countColsIn(afterContent, 'prowitem');
  if (headerCols > 0 && itemCols > 0 && headerCols !== itemCols) {
    issues.push(`[ColumnMismatch] prowheader has ${headerCols} cols, prowitem has ${itemCols} cols`);
    score -= 3;
  }

  // ── Sensor 5: 内容完整性 ──
  if (afterLen > 0 && afterLen < 80) {
    issues.push(`Suspiciously short output: ${afterLen} chars`);
    score -= 4;
  }
  if (beforeLen > 100 && afterLen === 0) {
    issues.push('File was emptied');
    score -= 10;
  }

  const finalScore = Math.max(0, Math.min(10, score));

  return {
    score: finalScore,
    printSafeScore: Math.max(0, 10 - printSafeDeduction),
    htmlValidScore: Math.max(0, 10 - htmlDeduction),
    diffReasonable: !(beforeLen > 100 && diffSize > beforeLen * 0.8),
    issues,
  };
};
