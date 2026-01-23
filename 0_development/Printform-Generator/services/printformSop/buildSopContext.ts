import { retrieveSopInfo } from './retrieveSopInfo';

const summarizeQuery = (terms: string[]) => terms.slice(0, 10).join(', ');

export const buildPrintformSopRagBlock = (inputText: string): string => {
  const text = String(inputText || '').trim();
  if (!text) return '';

  const retrieved = retrieveSopInfo(text, { maxSections: 3, maxTotalChars: 3200, minScore: 1 });
  if (!retrieved.combined.trim()) return '';

  return `
[PRINTFORM_JS_SOP_RAG]
query_terms: ${summarizeQuery(retrieved.queryTerms)}

You MUST follow the SOP excerpts below. When you add/change any PrintForm.js-related structure (data-* attrs, .pheader/.prowheader/.prowitem/.pfooter_pagenum, page number placeholders), explain the reason in Chinese and reference the exact SOP rule you applied.

[SOP EXCERPTS START]
${retrieved.combined}
[SOP EXCERPTS END]
`.trim();
};
