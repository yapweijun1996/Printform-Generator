import type { ToolExecutorDependencies, ToolExecutionResult } from './toolTypes';
import { logToolResult } from '../../utils/auditLogger';
import { executeManagePlan } from './planExecutor';
import { executeReadAllFiles, executeReadFile } from './fileExecutor';
import { executeGrepSearch } from './searchExecutor';
import { executeInsertContent, executeModifyCode, executeUndoLast } from './editingExecutor';
import { executeDiffCheck, executeLoadReferenceTemplate, executePrintSafeValidator } from './utilityExecutor';

const resolveToolName = (toolName: string) =>
  String(toolName || '')
    .trim()
    .split('|')[0]
    .trim();

const getDefaultDescription = (resolvedToolName: string, args: any) => {
  if (resolvedToolName === 'manage_plan') return `Plan: ${String(args?.action || 'update')}`;
  if (resolvedToolName === 'read_file') return 'Read active file';
  if (resolvedToolName === 'read_all_files') return 'Read all project files';
  if (resolvedToolName === 'grep_search') return 'Search project files';
  if (resolvedToolName === 'diff_check') return 'Preview diff';
  if (resolvedToolName === 'print_safe_validator') return 'Validate print-safe rules';
  if (resolvedToolName === 'load_reference_template') return 'Load reference template';
  return String(args?.change_description || 'AI Modification');
};

export const executeToolCall = async (
  toolName: string,
  args: any,
  deps: ToolExecutorDependencies,
): Promise<ToolExecutionResult> => {
  const resolvedToolName = resolveToolName(toolName);
  const description = getDefaultDescription(resolvedToolName, args);

  const currentFile = deps.getActiveFile();
  const currentContent = currentFile.content;

  let result: ToolExecutionResult = { success: false, output: `Unknown tool: ${resolvedToolName}` };

  try {
    switch (resolvedToolName) {
      case 'manage_plan':
        result = await executeManagePlan(args, deps.tasksRef, deps.setTasks);
        break;
      case 'undo_last':
        result = executeUndoLast(deps);
        break;
      case 'read_file':
        result = executeReadFile(currentFile, args);
        break;
      case 'read_all_files':
        result = executeReadAllFiles(deps.getAllFiles(), args);
        break;
      case 'grep_search':
        result = executeGrepSearch(currentFile, deps.getAllFiles(), args);
        break;
      case 'diff_check':
        result = executeDiffCheck(currentContent, args);
        break;
      case 'print_safe_validator':
        result = executePrintSafeValidator(currentContent, args);
        break;
      case 'load_reference_template':
        result = await executeLoadReferenceTemplate(args);
        break;
      case 'modify_code':
        result = executeModifyCode(currentContent, args);
        break;
      case 'insert_content':
        result = executeInsertContent(currentContent, args);
        break;
      default:
        result = { success: false, output: `Unknown tool: ${resolvedToolName}` };
    }

    if (result.success && typeof result.updatedContent === 'string') {
      if (result.updatedContent === currentFile.content) {
        result = { success: false, output: 'No changes applied (content identical).' };
      } else {
        deps.updateFileContent(result.updatedContent, description);
      }
    }

    logToolResult({
      action: resolvedToolName,
      description,
      status: result.success ? 'success' : 'error',
      details: result.output,
      args,
    });

    return { success: result.success, output: result.output };
  } catch (e: any) {
    const errorText = `System Error during execution: ${e?.message || 'Unknown error'}`;
    logToolResult({
      action: resolvedToolName,
      description,
      status: 'error',
      details: errorText,
      args,
    });
    return { success: false, output: errorText };
  }
};
