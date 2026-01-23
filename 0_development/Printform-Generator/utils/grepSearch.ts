import type { ProjectFile } from '../types';

export interface GrepMatch {
  fileName: string;
  lineNumber: number;
  lineText: string;
}

export const grepSearch = (
  files: ProjectFile[],
  regex: RegExp,
  maxMatches: number = 50,
): { matches: GrepMatch[]; truncated: boolean } => {
  const matches: GrepMatch[] = [];
  for (const file of files) {
    const lines = String(file.content || '').split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      if (regex.test(lines[i])) {
        matches.push({ fileName: file.name, lineNumber: i + 1, lineText: lines[i] });
        if (matches.length >= maxMatches) return { matches, truncated: true };
      }
    }
  }
  return { matches, truncated: false };
};
