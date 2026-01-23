import type { ProjectFile } from '../../types';
import type { ToolExecutionResult } from './toolTypes';

export const executeReadFile = (activeFile: ProjectFile, args: any): ToolExecutionResult => {
  const maxChars = Number.isFinite(args?.max_chars) ? Number(args.max_chars) : 20000;
  const content = String(activeFile.content || '');
  const clipped = content.slice(0, Math.max(0, maxChars));
  const truncated = clipped.length < content.length;
  return {
    success: true,
    output: [`[ACTIVE FILE] ${activeFile.name}`, clipped, truncated ? '\n... (truncated)\n' : ''].join('\n'),
  };
};

export const executeReadAllFiles = (files: ProjectFile[], args: any): ToolExecutionResult => {
  const maxCharsPerFile = Number.isFinite(args?.max_chars_per_file) ? Number(args.max_chars_per_file) : 12000;
  const maxTotalChars = Number.isFinite(args?.max_total_chars) ? Number(args.max_total_chars) : 30000;

  const chunks: string[] = [];
  let total = 0;
  for (const f of files) {
    const header = `\n[FILE] ${f.name}\n`;
    const content = String(f.content || '');
    const clipped = content.slice(0, Math.max(0, maxCharsPerFile));
    const truncated = clipped.length < content.length ? '\n... (truncated)\n' : '\n';

    const next = header + clipped + truncated;
    if (total + next.length > maxTotalChars) {
      chunks.push('\n... (truncated: max_total_chars reached)\n');
      break;
    }
    chunks.push(next);
    total += next.length;
  }
  return { success: true, output: chunks.join('') };
};
