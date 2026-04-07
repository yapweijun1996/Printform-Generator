import type { Tool } from './Tool';
import { managePlanTool } from './tools/ManagePlanTool';
import { modifyCodeTool, insertContentTool, undoLastTool } from './tools/EditingTools';
import { readFileTool, readAllFilesTool, grepSearchTool } from './tools/ReadTools';
import {
  diffCheckTool,
  printSafeValidatorTool,
  htmlValidationTool,
  loadReferenceTemplateTool,
} from './tools/UtilityTools';

/**
 * Tool 注册表
 * 参考 Claude Code 的 Tool Registry 模式:
 * - 集中管理所有工具
 * - 通过 name 查找
 * - 支持查询并发安全性
 */
const registry = new Map<string, Tool>();

// 注册所有工具
const allTools: Tool[] = [
  // 状态管理
  managePlanTool,
  // 代码编辑
  modifyCodeTool,
  insertContentTool,
  undoLastTool,
  // 只读
  readFileTool,
  readAllFilesTool,
  grepSearchTool,
  // 校验/工具
  diffCheckTool,
  printSafeValidatorTool,
  htmlValidationTool,
  loadReferenceTemplateTool,
];

for (const tool of allTools) {
  registry.set(tool.name, tool);
}

/** 根据名称解析工具（支持 "name|alias" 格式） */
const resolveToolName = (toolName: string): string =>
  String(toolName || '')
    .trim()
    .split('|')[0]
    .trim();

/** 根据名称获取工具实例 */
export const getToolByName = (toolName: string): Tool | undefined => registry.get(resolveToolName(toolName));

/** 获取所有已注册工具 */
export const getAllTools = (): Tool[] => Array.from(registry.values());

/** 获取所有并发安全工具的名称 */
export const getConcurrencySafeToolNames = (): string[] =>
  getAllTools()
    .filter((t) => t.isConcurrencySafe)
    .map((t) => t.name);

/** 获取所有破坏性工具的名称 */
export const getDestructiveToolNames = (): string[] =>
  getAllTools()
    .filter((t) => t.isDestructive)
    .map((t) => t.name);

/** 解析工具名称（导出供外部使用） */
export { resolveToolName };
