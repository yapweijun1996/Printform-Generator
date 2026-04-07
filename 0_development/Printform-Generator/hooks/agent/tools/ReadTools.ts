import type { Tool, ToolContext, ToolResult } from '../Tool';
import { grepSearch } from '../../../utils/grepSearch';

export const readFileTool: Tool = {
  name: 'read_file',
  friendlyName: 'Read File',
  statusText: 'Reading file...',
  isConcurrencySafe: true,
  isDestructive: false,

  async call(args: any, context: ToolContext): Promise<ToolResult> {
    const activeFile = context.getActiveFile();
    const maxChars = Number.isFinite(args?.max_chars) ? Number(args.max_chars) : 20000;
    const content = String(activeFile.content || '');
    const clipped = content.slice(0, Math.max(0, maxChars));
    const truncated = clipped.length < content.length;
    return {
      success: true,
      output: [`[ACTIVE FILE] ${activeFile.name}`, clipped, truncated ? '\n... (truncated)\n' : ''].join('\n'),
    };
  },
};

export const readAllFilesTool: Tool = {
  name: 'read_all_files',
  friendlyName: 'Read All Files',
  statusText: 'Scanning project files...',
  isConcurrencySafe: true,
  isDestructive: false,

  async call(args: any, context: ToolContext): Promise<ToolResult> {
    const files = context.getAllFiles();
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
  },
};

export const grepSearchTool: Tool = {
  name: 'grep_search',
  friendlyName: 'Grep Search',
  statusText: 'Searching project files...',
  isConcurrencySafe: true,
  isDestructive: false,

  async call(args: any, context: ToolContext): Promise<ToolResult> {
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

    const files = scope === 'active' ? [context.getActiveFile()] : context.getAllFiles();
    const { matches, truncated } = grepSearch(files, regex, maxMatches);
    if (matches.length === 0) return { success: true, output: 'No matches found.' };
    const lines = matches.map((m) => `${m.fileName}:${m.lineNumber}: ${m.lineText}`);
    if (truncated) lines.push('... (truncated: max_matches reached)');
    return { success: true, output: lines.join('\n') };
  },
};
