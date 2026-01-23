import type { ToolExecutorDependencies, ToolExecutionResult } from './toolTypes';

const escapeRegExp = (s: string) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Fuzzy snippet match to tolerate minor HTML formatting differences:
 * - Whitespace differences (spaces/newlines/tabs)
 * - Attribute spacing differences (attr="x" vs attr = "x")
 */
export const findFuzzyMatch = (content: string, search: string): { start: number; end: number } | null => {
  if (!search || !content) return null;

  const exactIdx = content.indexOf(search);
  if (exactIdx !== -1) return { start: exactIdx, end: exactIdx + search.length };

  const escaped = escapeRegExp(search);

  // 1) Allow arbitrary whitespace between any tokens
  let pattern = escaped.replace(/\s+/g, '\\s*');

  // 2) Allow whitespace around '=' for attribute matching
  pattern = pattern.replace(/=/g, '\\s*=\\s*');

  try {
    const regex = new RegExp(pattern, 'mi');
    const match = content.match(regex);
    if (match && match.index !== undefined) {
      return { start: match.index, end: match.index + match[0].length };
    }
  } catch {
    // ignore
  }

  return null;
};

export const getAnchorNotFoundError = (anchor: string) => {
  const excerpt = String(anchor || '').slice(0, 60);
  return [
    `Error: Could not find target anchor for insertion: "${excerpt}..."`,
    'Recovery:',
    '- Re-check the latest file content (read_file).',
    '- Use grep_search to locate a nearby stable anchor.',
    '- If the structure changed a lot, use modify_code with operation="rewrite".',
  ].join('\n');
};

export const executeModifyCode = (currentContent: string, args: any): ToolExecutionResult => {
  const { operation, search_snippet, new_code } = args;
  if (operation === 'rewrite') {
    const next = String(new_code ?? '');
    const nextTrimmed = next.trim();

    // Safety: prevent accidental "wipe the file" rewrites due to malformed tool calls.
    // Allow explicit emptying only when the current content is already empty.
    if (currentContent.trim() && nextTrimmed.length === 0) {
      return {
        success: false,
        output:
          'Error: Refusing to rewrite the file with empty content. This usually indicates a malformed tool call.\n' +
          'Recovery:\n' +
          '- Re-run with operation="rewrite" and provide the FULL HTML.\n' +
          '- Or use undo_last to revert.',
      };
    }

    // Guard against unrealistically short rewrites (likely truncated output).
    if (currentContent.trim() && nextTrimmed.length > 0 && nextTrimmed.length < 80) {
      return {
        success: false,
        output:
          `Error: Refusing to rewrite the file with suspiciously short content (${nextTrimmed.length} chars).\n` +
          'Recovery:\n' +
          '- Provide the FULL HTML document in new_code.\n' +
          '- If you intended a small edit, use operation="replace" instead.',
      };
    }

    return { success: true, output: 'Rewrote entire file.', updatedContent: next };
  }

  if (operation === 'replace') {
    if (!search_snippet) return { success: false, output: 'Error: search_snippet is required for replace.' };
    const match = findFuzzyMatch(currentContent, String(search_snippet));
    if (!match)
      return { success: false, output: 'Error: Could not find snippet. Please verify it exists exactly as typed.' };
    const updated = currentContent.slice(0, match.start) + String(new_code ?? '') + currentContent.slice(match.end);
    return { success: true, output: 'Replaced code snippet (fuzzy match used).', updatedContent: updated };
  }

  return { success: false, output: `Unknown operation: ${String(operation)}` };
};

export const executeInsertContent = (currentContent: string, args: any): ToolExecutionResult => {
  const { target_snippet, position, new_code } = args;
  const match = findFuzzyMatch(currentContent, String(target_snippet));
  if (!match) return { success: false, output: getAnchorNotFoundError(String(target_snippet)) };

  const insert = String(new_code ?? '');
  const updated =
    position === 'after'
      ? currentContent.slice(0, match.end) + '\n' + insert + currentContent.slice(match.end)
      : currentContent.slice(0, match.start) + insert + '\n' + currentContent.slice(match.start);

  return { success: true, output: `Inserted code ${position} snippet (fuzzy match used).`, updatedContent: updated };
};

export const executeUndoLast = (deps: ToolExecutorDependencies): ToolExecutionResult => {
  const ok = deps.revertToLatestHistory();
  return ok
    ? { success: true, output: 'Undid last change (reverted to latest history snapshot).' }
    : { success: false, output: 'No history available to undo.' };
};
