import { validatePrintSafe } from '../../utils/printSafeValidator';
import { validateStrictHtmlTables } from '../../utils/strictHtmlTableValidator';
import type { ConversationHandlerDependencies } from './conversationTypes';
import { getToolByName } from './toolRegistry';

const clip = (s: string, max: number) => {
  const text = String(s || '');
  if (text.length <= max) return text;
  return text.slice(0, max) + '\n... (truncated)\n';
};

const looksLikePrintform = (html: string) => /<div\b[^>]*class=["'][^"']*\bprintform\b/i.test(html);

const inferTemplateName = (userMessage: string) => {
  const msg = String(userMessage || '').toLowerCase();
  if (msg.includes('delivery') || msg.includes('despatch') || msg.includes('dispatch'))
    return 'delivery_order_test.html';
  if (msg.includes('invoice')) return 'demo001.html';
  return 'index.html';
};

const shouldAutoLoadTemplate = (userMessage: string, currentHtml: string) => {
  const msg = String(userMessage || '').toLowerCase();
  const isNewOrGenerate =
    /create|generate|build|make|based on|from scratch|new form|template|invoice|delivery note|delivery/i.test(msg);
  const isEmptyOrNotStarted = !String(currentHtml || '').trim() || !looksLikePrintform(currentHtml);
  return isNewOrGenerate && isEmptyOrNotStarted;
};

const summarizeIssues = (issues: Array<{ level: string; code: string; message: string }>, max: number) => {
  if (!issues || issues.length === 0) return '✅ none';
  const lines = issues.slice(0, max).map((i) => `- [${String(i.level).toUpperCase()}] ${i.code}: ${i.message}`);
  return lines.join('\n');
};

export const buildAutoGroundingContext = async (params: {
  userMessage: string;
  deps: ConversationHandlerDependencies;
  recursionDepth: number;
  hasReferenceImage: boolean;
}): Promise<string> => {
  const { userMessage, deps, recursionDepth, hasReferenceImage } = params;
  const currentHtml = deps.getActiveFile()?.content || '';

  const isFirstTurn = recursionDepth === 0;
  const enabled = new Set(deps.activeTools || []);
  const shouldUseVision = enabled.has('image_analysis') || enabled.has('visual_review');

  const parts: string[] = [];
  parts.push('[AUTO_GROUNDING]');
  parts.push(
    `- intent: ${String(userMessage || '')
      .slice(0, 120)
      .replace(/\s+/g, ' ')
      .trim()}`,
  );

  // 1) Optional template retrieval (for new/generate tasks)
  if (enabled.has('load_reference_template') && shouldAutoLoadTemplate(userMessage, currentHtml)) {
    const templateName = inferTemplateName(userMessage);
    const loadTemplateTool = getToolByName('load_reference_template');
    const templateResult = loadTemplateTool
      ? await loadTemplateTool.call({ template_name: templateName, max_chars: 8000 }, { getActiveFile: deps.getActiveFile, getAllFiles: deps.getAllFiles, updateFileContent: deps.updateFileContent, revertToLatestHistory: () => false, tasksRef: deps.tasksRef, setTasks: deps.setTasks })
      : { success: false, output: 'load_reference_template tool not registered.' };
    parts.push(`- reference_template: ${templateName}`);
    parts.push(clip(templateResult.output, 2500));
  }

  // 2) Validate current HTML (best-effort, read-only)
  if (enabled.has('print_safe_validator')) {
    const tasks = deps.tasksRef.current || [];
    const hasPendingOrInProgress = tasks.some((t) => t.status === 'pending' || t.status === 'in_progress');
    const requirePrintformjs = !hasPendingOrInProgress;
    const requireThreePageTest = !hasPendingOrInProgress;

    const printSafeIssues = validatePrintSafe(currentHtml, {
      pageWidth: deps.pageWidth,
      pageHeight: deps.pageHeight,
      maxIssues: 12,
      requirePrintformjs,
      requireThreePageTest,
      minProwitemCount: deps.minRowItemsForPaginationTest || 70,
    });
    parts.push('- print_safe_validator:');
    parts.push(summarizeIssues(printSafeIssues, 8));
  }

  if (enabled.has('html_validation')) {
    const htmlIssues = validateStrictHtmlTables(currentHtml, {
      maxIssues: 10,
      allowTrDirectlyUnderTable: true,
      allowTableFragmentsInTemplate: true,
    });
    parts.push('- html_validation:');
    parts.push(summarizeIssues(htmlIssues as any, 8));
  }

  // 3) Proactive prowitem count hint
  if (currentHtml.trim() && looksLikePrintform(currentHtml)) {
    const prowitemCount = (currentHtml.match(/class=["'][^"']*\bprowitem\b[^"']*["']/gi) || []).length;
    const hasProwheader = /class=["'][^"']*\bprowheader\b/i.test(currentHtml);
    if (hasProwheader && prowitemCount === 0) {
      parts.push('- WARNING: prowheader exists but 0 prowitem blocks. You MUST add at least 20~30 prowitem rows.');
    } else if (prowitemCount > 0 && prowitemCount < 20) {
      parts.push(`- HINT: Only ${prowitemCount} prowitem blocks. Consider generating 20~30 for pagination testing.`);
    }
  }

  // 4) Vision hint (no tool call here; only instruction)
  if (isFirstTurn && shouldUseVision && hasReferenceImage) {
    parts.push('- vision: reference+preview available -> MUST output [VISUAL DIFF] before editing.');
  }

  return parts.join('\n') + '\n[/AUTO_GROUNDING]';
};
