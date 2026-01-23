import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { AgentTask, ProjectFile } from '../../types';
import { makeDiffPreview } from '../../utils/diffPreview';
import { grepSearch } from '../../utils/grepSearch';
import { validatePrintSafe } from '../../utils/printSafeValidator';
import { saveAuditLogEntry } from '../../utils/indexedDb';

interface ToolExecutionResult {
  success: boolean;
  output: string;
}

interface ToolExecutorDependencies {
  getActiveFile: () => ProjectFile;
  getAllFiles: () => ProjectFile[];
  updateFileContent: (content: string, description: string) => void;
  revertToLatestHistory: () => boolean;
  tasksRef: MutableRefObject<AgentTask[]>;
  setTasks: Dispatch<SetStateAction<AgentTask[]>>;
}

export const executeToolCall = async (
  toolName: string,
  args: any,
  deps: ToolExecutorDependencies,
): Promise<ToolExecutionResult> => {
  const { getActiveFile, getAllFiles, updateFileContent, revertToLatestHistory, tasksRef, setTasks } = deps;

  const resolvedToolName = String(toolName || '')
    .trim()
    .split('|')[0]
    .trim();

  const currentFile = getActiveFile();
  let currentContent = currentFile.content;
  let toolResultText = '';
  let success = false;
  const changeDescription = args.change_description || 'AI Modification';

  try {
    if (resolvedToolName === 'manage_plan') {
      return await handleManagePlan(args, tasksRef, setTasks);
    }

    if (resolvedToolName === 'undo_last') {
      const ok = revertToLatestHistory();
      return ok
        ? { success: true, output: 'Undid last change (reverted to latest history snapshot).' }
        : { success: false, output: 'No history available to undo.' };
    }

    if (resolvedToolName === 'read_file') {
      const maxChars = Number.isFinite(args?.max_chars) ? Number(args.max_chars) : 20000;
      const clipped = String(currentFile.content || '').slice(0, Math.max(0, maxChars));
      const truncated = clipped.length < String(currentFile.content || '').length;
      return {
        success: true,
        output: [`[ACTIVE FILE] ${currentFile.name}`, clipped, truncated ? '\n... (truncated)\n' : ''].join('\n'),
      };
    }

    if (resolvedToolName === 'read_all_files') {
      const maxCharsPerFile = Number.isFinite(args?.max_chars_per_file) ? Number(args.max_chars_per_file) : 12000;
      const maxTotalChars = Number.isFinite(args?.max_total_chars) ? Number(args.max_total_chars) : 30000;

      const files = getAllFiles();
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
    }

    if (resolvedToolName === 'grep_search') {
      const pattern = String(args?.pattern || '');
      const flags = String(args?.flags || 'i');
      const scope = (args?.scope === 'active' ? 'active' : 'all') as 'active' | 'all';
      const maxMatches = Number.isFinite(args?.max_matches) ? Number(args.max_matches) : 50;
      let regex: RegExp;
      try {
        regex = new RegExp(pattern, flags);
      } catch (e: any) {
        return { success: false, output: `Invalid regex: ${e?.message || 'Unknown error'}` };
      }
      const files = scope === 'active' ? [currentFile] : getAllFiles();
      const { matches, truncated } = grepSearch(files, regex, maxMatches);
      if (matches.length === 0) return { success: true, output: 'No matches found.' };
      const lines = matches.map((m) => `${m.fileName}:${m.lineNumber}: ${m.lineText}`);
      if (truncated) lines.push('... (truncated: max_matches reached)');
      return { success: true, output: lines.join('\n') };
    }

    if (resolvedToolName === 'diff_check') {
      const operation = String(args?.operation || '');
      const newCode = String(args?.new_code || '');
      const searchSnippet = args?.search_snippet != null ? String(args.search_snippet) : '';
      const targetSnippet = args?.target_snippet != null ? String(args.target_snippet) : '';

      let proposed = currentContent;
      if (operation === 'rewrite') {
        proposed = newCode;
      } else if (operation === 'replace') {
        if (!searchSnippet) return { success: false, output: 'Error: search_snippet is required for replace.' };
        proposed = currentContent.includes(searchSnippet)
          ? currentContent.replace(searchSnippet, newCode)
          : currentContent;
      } else if (operation === 'insert_before' || operation === 'insert_after') {
        if (!targetSnippet) return { success: false, output: 'Error: target_snippet is required for insert.' };
        if (!currentContent.includes(targetSnippet))
          return { success: false, output: 'Error: target_snippet not found.' };
        proposed =
          operation === 'insert_after'
            ? currentContent.replace(targetSnippet, targetSnippet + '\n' + newCode)
            : currentContent.replace(targetSnippet, newCode + '\n' + targetSnippet);
      } else {
        return { success: false, output: `Unknown operation: ${operation}` };
      }

      const preview = makeDiffPreview(currentContent, proposed);
      return { success: true, output: preview.summary };
    }

    if (resolvedToolName === 'print_safe_validator') {
      const pageWidth = args?.pageWidth != null ? String(args.pageWidth) : undefined;
      const pageHeight = args?.pageHeight != null ? String(args.pageHeight) : undefined;
      const maxIssues = Number.isFinite(args?.max_issues) ? Number(args.max_issues) : 50;
      const issues = validatePrintSafe(currentContent, { pageWidth, pageHeight, maxIssues });
      if (issues.length === 0) return { success: true, output: '✅ No issues found (best-effort validator).' };
      const lines = issues.map((i, idx) => `${idx + 1}. [${i.level.toUpperCase()}] ${i.code}: ${i.message}`);
      return { success: true, output: lines.join('\n') };
    }

    if (resolvedToolName === 'load_reference_template') {
      const templateName = args?.template_name ? String(args.template_name).trim() : '';
      const maxChars = Number.isFinite(args?.max_chars) ? Number(args.max_chars) : 30000;

      // List of available templates in printform-js/
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

      // If no template specified, list available templates
      if (!templateName) {
        return {
          success: true,
          output: `Available reference templates:\n${availableTemplates.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nUse load_reference_template with template_name to load a specific example.`,
        };
      }

      // Validate template name
      if (!availableTemplates.includes(templateName)) {
        return {
          success: false,
          output: `Template "${templateName}" not found. Available templates: ${availableTemplates.join(', ')}`,
        };
      }

      // Load template from public/printform-js/
      try {
        const response = await fetch(`/printform-js/${templateName}`);
        if (!response.ok) {
          return { success: false, output: `Failed to load template: ${response.statusText}` };
        }
        const content = await response.text();
        const clipped = content.slice(0, Math.max(0, maxChars));
        const truncated = clipped.length < content.length;
        return {
          success: true,
          output: [
            `[REFERENCE TEMPLATE] ${templateName}`,
            `This is a working example from the printform-js library.`,
            `Study the structure, data-* attributes, class names (.pheader, .prowheader, .prowitem, .pfooter_pagenum), and styling patterns.`,
            '',
            clipped,
            truncated ? '\n... (truncated)\n' : '',
          ].join('\n'),
        };
      } catch (error: any) {
        return { success: false, output: `Error loading template: ${error?.message || 'Unknown error'}` };
      }
    }

    if (resolvedToolName === 'modify_code') {
      const { operation, search_snippet, new_code } = args;

      if (operation === 'rewrite') {
        currentContent = new_code;
        toolResultText = 'Rewrote entire file.';
        success = true;
      } else if (operation === 'replace') {
        if (!search_snippet) {
          toolResultText = 'Error: search_snippet is required for replace.';
        } else if (currentContent.includes(search_snippet)) {
          currentContent = currentContent.replace(search_snippet, new_code);
          toolResultText = 'Replaced code snippet.';
          success = true;
        } else {
          const trimmedContent = currentContent.replace(/\s+/g, ' ');
          const trimmedSearch = String(search_snippet).replace(/\s+/g, ' ');
          if (trimmedContent.includes(trimmedSearch)) {
            toolResultText = 'Error: Snippet found but whitespace mismatch. Please copy exact whitespace.';
          } else {
            toolResultText = 'Error: Could not find exact snippet. Please verify it exists exactly as typed.';
          }
        }
      }
    } else if (resolvedToolName === 'insert_content') {
      const { target_snippet, position, new_code } = args;
      if (currentContent.includes(target_snippet)) {
        if (position === 'after') {
          currentContent = currentContent.replace(target_snippet, target_snippet + '\n' + new_code);
        } else {
          currentContent = currentContent.replace(target_snippet, new_code + '\n' + target_snippet);
        }
        toolResultText = `Inserted code ${position} snippet.`;
        success = true;
      } else {
        toolResultText = `Error: Could not find target anchor for insertion: "${String(target_snippet).substring(0, 30)}..."`;
      }
    }

    if (success && currentContent !== currentFile.content) {
      updateFileContent(currentContent, changeDescription);
      if (!toolResultText) toolResultText = `Successfully executed ${resolvedToolName}`;

      // 记录审计日志
      saveAuditLogEntry({
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        action: resolvedToolName,
        description: changeDescription,
        status: 'success',
        details: toolResultText,
        args,
      }).catch(() => {
        /* ignore */
      });

      return { success: true, output: toolResultText };
    }
  } catch (e: any) {
    toolResultText = `System Error during execution: ${e.message}`;

    // 记录失败的审计日志
    saveAuditLogEntry({
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      action: resolvedToolName,
      description: changeDescription,
      status: 'error',
      details: toolResultText,
      args,
    }).catch(() => {
      /* ignore */
    });
  }

  return { success: false, output: toolResultText };
};

async function handleManagePlan(
  args: any,
  tasksRef: MutableRefObject<AgentTask[]>,
  setTasks: Dispatch<SetStateAction<AgentTask[]>>,
): Promise<ToolExecutionResult> {
  const { action, tasks: newTasksList, task_index, failure_reason } = args;

  const updateTasks = (newTaskList: AgentTask[]) => {
    setTasks(newTaskList);
    tasksRef.current = newTaskList;
  };

  if (action === 'create_plan') {
    if (!Array.isArray(newTasksList) || newTasksList.length === 0) {
      return { success: false, output: 'Error: tasks is required (non-empty array) for create_plan.' };
    }
    const generatedTasks = (newTasksList || []).map((desc: string, i: number) => ({
      id: `task-${Date.now()}-${i}`,
      description: desc,
      status: i === 0 ? ('in_progress' as const) : ('pending' as const),
    }));
    updateTasks(generatedTasks as AgentTask[]);
    return { success: true, output: `Created plan with ${generatedTasks.length} tasks.` };
  }

  if (action === 'add_task') {
    if (!Array.isArray(newTasksList) || newTasksList.length === 0) {
      return { success: false, output: 'Error: tasks is required (non-empty array) for add_task.' };
    }
    const additionalTasks = (newTasksList || []).map((desc: string, i: number) => ({
      id: `task-add-${Date.now()}-${i}`,
      description: desc,
      status: 'pending' as const,
    }));
    updateTasks([...(tasksRef.current || []), ...(additionalTasks as AgentTask[])]);
    return { success: true, output: `Added ${additionalTasks.length} tasks.` };
  }

  if (action === 'mark_completed') {
    if (!Number.isFinite(task_index) || task_index == null) {
      return { success: false, output: 'Error: task_index is required for mark_completed.' };
    }
    if (task_index < 0 || task_index >= (tasksRef.current || []).length) {
      return { success: false, output: `Error: task_index out of range: ${task_index}` };
    }
    const updated = (tasksRef.current || []).map((t, i) =>
      i === task_index ? { ...t, status: 'completed' as const } : t,
    );
    updateTasks(updated);
    return { success: true, output: `Marked task #${task_index + 1} as completed.` };
  }

  if (action === 'mark_in_progress') {
    if (!Number.isFinite(task_index) || task_index == null) {
      return { success: false, output: 'Error: task_index is required for mark_in_progress.' };
    }
    if (task_index < 0 || task_index >= (tasksRef.current || []).length) {
      return { success: false, output: `Error: task_index out of range: ${task_index}` };
    }
    const updated = (tasksRef.current || []).map((t, i) =>
      i === task_index ? { ...t, status: 'in_progress' as const } : t,
    );
    updateTasks(updated);
    return { success: true, output: `Started working on task #${task_index + 1}.` };
  }

  if (action === 'mark_failed') {
    if (!Number.isFinite(task_index) || task_index == null) {
      return { success: false, output: 'Error: task_index is required for mark_failed.' };
    }
    if (task_index < 0 || task_index >= (tasksRef.current || []).length) {
      return { success: false, output: `Error: task_index out of range: ${task_index}` };
    }
    const updated = (tasksRef.current || []).map((t, i) =>
      i === task_index
        ? { ...t, status: 'failed' as const, description: `${t.description} (Failed: ${failure_reason || 'Unknown'})` }
        : t,
    );
    updateTasks(updated);
    return { success: true, output: `Marked task #${task_index + 1} as failed.` };
  }

  return { success: false, output: `Unknown action: ${action}` };
}
