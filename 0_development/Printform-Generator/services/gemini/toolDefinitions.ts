/**
 * 工具定义模块（聚合）
 * 说明：为遵守单文件 ≤300 行约束，将具体 Tool 定义拆分到多个文件。
 */

export { managePlanTool } from './toolDefinitions.plan';
export { modifyCodeTool, insertContentTool, undoLastTool } from './toolDefinitions.editing';
export { readFileTool, readAllFilesTool, grepSearchTool } from './toolDefinitions.grounding';
export {
  diffCheckTool,
  printSafeValidatorTool,
  htmlValidationTool,
  visualReviewTool,
  loadReferenceTemplateTool,
} from './toolDefinitions.utility';

import { managePlanTool } from './toolDefinitions.plan';
import { modifyCodeTool, insertContentTool, undoLastTool } from './toolDefinitions.editing';
import { readFileTool, readAllFilesTool, grepSearchTool } from './toolDefinitions.grounding';
import {
  diffCheckTool,
  printSafeValidatorTool,
  htmlValidationTool,
  visualReviewTool,
  loadReferenceTemplateTool,
} from './toolDefinitions.utility';

/**
 * 获取所有可用的工具定义
 */
export const getAllTools = () => ({
  modifyCodeTool,
  insertContentTool,
  managePlanTool,
  undoLastTool,
  readFileTool,
  readAllFilesTool,
  grepSearchTool,
  diffCheckTool,
  printSafeValidatorTool,
  htmlValidationTool,
  visualReviewTool,
  loadReferenceTemplateTool,
});
