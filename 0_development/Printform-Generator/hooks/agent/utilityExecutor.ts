import { makeDiffPreview } from '../../utils/diffPreview';
import { validatePrintSafe } from '../../utils/printSafeValidator';
import { validateStrictHtmlTables } from '../../utils/strictHtmlTableValidator';
import type { ToolExecutionResult } from './toolTypes';
import { findFuzzyMatch } from './editingExecutor';
import { PRINTFORM_REFERENCE_TEMPLATES } from '../../constants';

export const executeDiffCheck = (currentContent: string, args: any): ToolExecutionResult => {
  const operation = String(args?.operation || '');
  const newCode = String(args?.new_code || '');
  const searchSnippet = args?.search_snippet != null ? String(args.search_snippet) : '';
  const targetSnippet = args?.target_snippet != null ? String(args.target_snippet) : '';

  let proposed = currentContent;
  if (operation === 'rewrite') {
    proposed = newCode;
  } else if (operation === 'replace') {
    if (!searchSnippet) return { success: false, output: 'Error: search_snippet is required for replace.' };
    const match = findFuzzyMatch(currentContent, searchSnippet);
    if (!match) return { success: false, output: 'Error: search_snippet not found.' };
    proposed = currentContent.slice(0, match.start) + newCode + currentContent.slice(match.end);
  } else if (operation === 'insert_before' || operation === 'insert_after') {
    if (!targetSnippet) return { success: false, output: 'Error: target_snippet is required for insert.' };
    const match = findFuzzyMatch(currentContent, targetSnippet);
    if (!match) return { success: false, output: 'Error: target_snippet not found.' };
    proposed =
      operation === 'insert_after'
        ? currentContent.slice(0, match.end) + '\n' + newCode + currentContent.slice(match.end)
        : currentContent.slice(0, match.start) + newCode + '\n' + currentContent.slice(match.start);
  } else {
    return { success: false, output: `Unknown operation: ${operation}` };
  }

  const preview = makeDiffPreview(currentContent, proposed);
  return { success: true, output: preview.summary };
};

export const executePrintSafeValidator = (currentContent: string, args: any): ToolExecutionResult => {
  const pageWidth = args?.pageWidth != null ? String(args.pageWidth) : undefined;
  const pageHeight = args?.pageHeight != null ? String(args.pageHeight) : undefined;
  const maxIssues = Number.isFinite(args?.max_issues) ? Number(args.max_issues) : 50;

  const requirePrintformjs = Boolean(args?.require_printformjs);
  const requireThreePageTest = Boolean(args?.require_three_page_test);
  const minProwitemCount = Number.isFinite(args?.min_prowitem_count) ? Number(args.min_prowitem_count) : undefined;

  const issues = validatePrintSafe(currentContent, {
    pageWidth,
    pageHeight,
    maxIssues,
    requirePrintformjs,
    requireThreePageTest,
    minProwitemCount,
  });
  if (issues.length === 0) return { success: true, output: '✅ No issues found (best-effort validator).' };
  const lines = issues.map((i, idx) => `${idx + 1}. [${i.level.toUpperCase()}] ${i.code}: ${i.message}`);
  return { success: true, output: lines.join('\n') };
};

export const executeHtmlValidation = (currentContent: string, args: any): ToolExecutionResult => {
  const maxIssues = Number.isFinite(args?.max_issues) ? Number(args.max_issues) : 80;
  const allowTrDirectlyUnderTable =
    typeof args?.allow_tr_directly_under_table === 'boolean' ? Boolean(args.allow_tr_directly_under_table) : true;
  const allowTableFragmentsInTemplate =
    typeof args?.allow_table_fragments_in_template === 'boolean'
      ? Boolean(args.allow_table_fragments_in_template)
      : true;

  const issues = validateStrictHtmlTables(currentContent, {
    maxIssues,
    allowTrDirectlyUnderTable,
    allowTableFragmentsInTemplate,
  });

  const hasHardErrors = issues.some((i) => i.level === 'error');
  const lines = issues.map((i, idx) => {
    const loc = i.line ? ` (line ${i.line}${i.col ? `:${i.col}` : ''})` : '';
    return `${idx + 1}. [${i.level.toUpperCase()}] ${i.code}${loc}: ${i.message}`;
  });
  return {
    success: true,
    output: `${hasHardErrors ? '❌' : '✅'} Strict HTML validation report:\n` + lines.join('\n'),
  };
};

export const executeLoadReferenceTemplate = async (args: any): Promise<ToolExecutionResult> => {
  const templateName = args?.template_name ? String(args.template_name).trim() : '';
  const maxChars = Number.isFinite(args?.max_chars) ? Number(args.max_chars) : 30000;

  if (!templateName) {
    return {
      success: true,
      output: `Available reference templates:\n${PRINTFORM_REFERENCE_TEMPLATES.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nUse load_reference_template with template_name to load a specific example.`,
    };
  }

  if (!PRINTFORM_REFERENCE_TEMPLATES.includes(templateName as any)) {
    return {
      success: false,
      output: `Template "${templateName}" not found. Available templates: ${PRINTFORM_REFERENCE_TEMPLATES.join(', ')}`,
    };
  }

  try {
    const response = await fetch(`/printform-js/${templateName}`);
    if (!response.ok) return { success: false, output: `Failed to load template: ${response.statusText}` };
    const content = await response.text();
    const clipped = content.slice(0, Math.max(0, maxChars));
    const truncated = clipped.length < content.length;
    return {
      success: true,
      output: [
        `[REFERENCE TEMPLATE] ${templateName}`,
        'This is a working example from the printform-js library.',
        'Study the structure, data-* attributes, class names (.pheader, .prowheader, .prowitem, .pfooter_pagenum), and styling patterns.',
        '',
        clipped,
        truncated ? '\n... (truncated)\n' : '',
      ].join('\n'),
    };
  } catch (error: any) {
    return { success: false, output: `Error loading template: ${error?.message || 'Unknown error'}` };
  }
};
