import { makeDiffPreview } from '../../utils/diffPreview';
import { validatePrintSafe } from '../../utils/printSafeValidator';
import type { ToolExecutionResult } from './toolTypes';
import { findFuzzyMatch } from './editingExecutor';

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

  const issues = validatePrintSafe(currentContent, { pageWidth, pageHeight, maxIssues });
  if (issues.length === 0) return { success: true, output: '✅ No issues found (best-effort validator).' };
  const lines = issues.map((i, idx) => `${idx + 1}. [${i.level.toUpperCase()}] ${i.code}: ${i.message}`);
  return { success: true, output: lines.join('\n') };
};

export const executeLoadReferenceTemplate = async (args: any): Promise<ToolExecutionResult> => {
  const templateName = args?.template_name ? String(args.template_name).trim() : '';
  const maxChars = Number.isFinite(args?.max_chars) ? Number(args.max_chars) : 30000;

  const availableTemplates = [
    'index.html',
    'demo001.html',
    'demo002.html',
    'delivery_order_test.html',
    'index001.html',
    'index002.html',
    'index003.html',
    'index004.html',
    'index005.html',
    'index006.html',
    'index007.html',
    'index008.html',
    'index009.html',
    'index010.html',
    'index011.html',
    'index012.html',
    'index013.html',
    'index014.html',
    'index015.html',
    'index016.html',
    'index017.html',
  ];

  if (!templateName) {
    return {
      success: true,
      output: `Available reference templates:\n${availableTemplates.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nUse load_reference_template with template_name to load a specific example.`,
    };
  }

  if (!availableTemplates.includes(templateName)) {
    return {
      success: false,
      output: `Template "${templateName}" not found. Available templates: ${availableTemplates.join(', ')}`,
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
