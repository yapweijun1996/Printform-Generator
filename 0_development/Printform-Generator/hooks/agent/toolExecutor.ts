import type { ToolExecutorDependencies, ToolExecutionResult } from './toolTypes';
import type { ToolContext } from './Tool';
import { logToolResult } from '../../utils/auditLogger';
import { getToolByName, resolveToolName } from './toolRegistry';
import { debugLog } from '../../utils/debug';

/**
 * 将 ToolExecutorDependencies 转换为统一的 ToolContext
 */
const toToolContext = (deps: ToolExecutorDependencies): ToolContext => ({
  getActiveFile: deps.getActiveFile,
  getAllFiles: deps.getAllFiles,
  updateFileContent: deps.updateFileContent,
  revertToLatestHistory: deps.revertToLatestHistory,
  tasksRef: deps.tasksRef,
  setTasks: deps.setTasks,
});

/**
 * Execute a tool call, returning structured result with artifacts/stateDelta/followupHints
 */
export const executeToolCall = async (
  toolName: string,
  args: any,
  deps: ToolExecutorDependencies,
): Promise<ToolExecutionResult> => {
  const resolved = resolveToolName(toolName);
  const tool = getToolByName(resolved);

  if (!tool) {
    return { success: false, output: `Unknown tool: ${resolved}` };
  }

  const currentFile = deps.getActiveFile();
  const beforeSnapshotContent = tool.isDestructive ? currentFile.content : undefined;

  debugLog('toolExecutor.call', {
    tool: resolved,
    file: currentFile?.name,
    currentChars: currentFile.content.length,
    argsKeys: Object.keys(args || {}),
    isConcurrencySafe: tool.isConcurrencySafe,
    isDestructive: tool.isDestructive,
  });

  const description = tool.friendlyName + (args?.change_description ? `: ${args.change_description}` : '');

  try {
    const context = toToolContext(deps);
    const result = await tool.call(args, context);

    // 如果工具返回了 updatedContent，应用到文件
    if (result.success && typeof result.updatedContent === 'string') {
      if (result.updatedContent === currentFile.content) {
        return { success: false, output: 'No changes applied (content identical).' };
      }
      debugLog('toolExecutor.write', {
        tool: resolved,
        beforeChars: currentFile.content.length,
        afterChars: result.updatedContent.length,
      });
      deps.updateFileContent(result.updatedContent, description);
    }

    logToolResult({
      action: resolved,
      description,
      status: result.success ? 'success' : 'error',
      details: result.output,
      args,
    });

    // Build structured execution result
    const executionResult: ToolExecutionResult = {
      success: result.success,
      output: result.output,
      artifacts: {
        ...(result.artifacts || {}),
        ...(beforeSnapshotContent !== undefined ? { beforeSnapshotContent: beforeSnapshotContent.slice(0, 500) } : {}),
      },
      stateDelta: result.stateDelta,
      followupHints: result.followupHints,
    };

    return executionResult;
  } catch (e: any) {
    const errorText = `System Error during execution: ${e?.message || 'Unknown error'}`;
    logToolResult({
      action: resolved,
      description,
      status: 'error',
      details: errorText,
      args,
    });
    return { success: false, output: errorText };
  }
};
