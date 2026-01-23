import type { ProjectFile } from '../../types';
import { grepSearch } from '../../utils/grepSearch';
import type { ToolExecutionResult } from './toolTypes';

export const executeGrepSearch = (activeFile: ProjectFile, allFiles: ProjectFile[], args: any): ToolExecutionResult => {
  const pattern = String(args?.pattern || '');
  const flags = String(args?.flags || 'i');
  const scope = args?.scope === 'active' ? 'active' : 'all';
  const maxMatches = Number.isFinite(args?.max_matches) ? Number(args.max_matches) : 50;

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch (e: any) {
    return { success: false, output: `Invalid regex: ${e?.message || 'Unknown error'}` };
  }

  const files = scope === 'active' ? [activeFile] : allFiles;
  const { matches, truncated } = grepSearch(files, regex, maxMatches);
  if (matches.length === 0) return { success: true, output: 'No matches found.' };
  const lines = matches.map((m) => `${m.fileName}:${m.lineNumber}: ${m.lineText}`);
  if (truncated) lines.push('... (truncated: max_matches reached)');
  return { success: true, output: lines.join('\n') };
};
