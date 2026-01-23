export interface DiffPreviewResult {
  changed: boolean;
  summary: string;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export const makeDiffPreview = (before: string, after: string, maxLines: number = 120): DiffPreviewResult => {
  if (before === after) {
    return { changed: false, summary: 'No changes would be applied (content is identical).' };
  }

  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');

  let start = 0;
  while (start < beforeLines.length && start < afterLines.length && beforeLines[start] === afterLines[start])
    start += 1;

  let endBefore = beforeLines.length - 1;
  let endAfter = afterLines.length - 1;
  while (endBefore >= start && endAfter >= start && beforeLines[endBefore] === afterLines[endAfter]) {
    endBefore -= 1;
    endAfter -= 1;
  }

  const context = 5;
  const beforeFrom = clamp(start - context, 0, beforeLines.length);
  const beforeTo = clamp(endBefore + context + 1, 0, beforeLines.length);
  const afterFrom = clamp(start - context, 0, afterLines.length);
  const afterTo = clamp(endAfter + context + 1, 0, afterLines.length);

  const beforeChunk = beforeLines.slice(beforeFrom, beforeTo);
  const afterChunk = afterLines.slice(afterFrom, afterTo);

  const estimatedChangedBefore = Math.max(0, endBefore - start + 1);
  const estimatedChangedAfter = Math.max(0, endAfter - start + 1);

  const previewLines: string[] = [];
  previewLines.push(
    `Diff preview (approx): before changed lines=${estimatedChangedBefore}, after changed lines=${estimatedChangedAfter}`,
  );
  previewLines.push(`--- BEFORE (context around first/last change; lines ${beforeFrom + 1}-${beforeTo}) ---`);
  beforeChunk.forEach((line, i) => previewLines.push(`${beforeFrom + i + 1}: ${line}`));
  previewLines.push(`--- AFTER (context around first/last change; lines ${afterFrom + 1}-${afterTo}) ---`);
  afterChunk.forEach((line, i) => previewLines.push(`${afterFrom + i + 1}: ${line}`));

  const trimmed = previewLines.slice(0, maxLines);
  if (trimmed.length < previewLines.length) trimmed.push(`... (truncated, max ${maxLines} lines)`);

  return { changed: true, summary: trimmed.join('\n') };
};
