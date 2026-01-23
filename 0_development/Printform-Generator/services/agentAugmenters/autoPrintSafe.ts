import { validatePrintSafe } from '../../utils/printSafeValidator';

export const buildAutoPrintSafeBlock = (params: {
  currentFileContext: string;
  pageWidth: string;
  pageHeight: string;
}): string => {
  const { currentFileContext, pageWidth, pageHeight } = params;
  const looksLikePrintHtml =
    /class=["'][^"']*\bprintform\b/i.test(currentFileContext) || /<table\b/i.test(currentFileContext);
  if (!looksLikePrintHtml) return '';

  const issues = validatePrintSafe(currentFileContext, {
    pageWidth,
    pageHeight,
    maxIssues: 12,
  });
  if (issues.length === 0) return '[AUTO_PRINT_SAFE_CHECK]\n✅ No issues found (best-effort validator).';

  const lines = issues.map((i, idx) => `${idx + 1}. [${i.level.toUpperCase()}] ${i.code}: ${i.message}`);
  return `[AUTO_PRINT_SAFE_CHECK]\n${lines.join('\n')}\n\nInstruction: Fix any ERRORs first, then address WARNs if they affect pagination/compatibility.`;
};
