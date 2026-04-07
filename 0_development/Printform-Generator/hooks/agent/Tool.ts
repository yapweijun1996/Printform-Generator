import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { AgentTask, ProjectFile } from '../../types';

/**
 * 工具执行上下文
 * 提供工具执行所需的所有依赖
 */
export interface ToolContext {
  getActiveFile: () => ProjectFile;
  getAllFiles: () => ProjectFile[];
  updateFileContent: (content: string, description: string) => void;
  revertToLatestHistory: () => boolean;
  tasksRef: MutableRefObject<AgentTask[]>;
  setTasks: Dispatch<SetStateAction<AgentTask[]>>;
}

/**
 * 工具执行结果 (v2: structured)
 */
export interface ToolResult {
  success: boolean;
  output: string;
  updatedContent?: string;
  /** Structured artifacts produced by the tool (e.g. validation results, file snapshots) */
  artifacts?: Record<string, any>;
  /** State changes the tool wants to communicate (e.g. { tasksModified: true }) */
  stateDelta?: Record<string, any>;
  /** Hints for the model about what to do next */
  followupHints?: string[];
}

/**
 * 统一 Tool 接口
 */
export interface Tool {
  /** 工具唯一名称，与 Gemini FunctionDeclaration 的 name 对应 */
  name: string;

  /** UI 友好名称 */
  friendlyName: string;

  /** 执行时的状态文本 (e.g. "Applying code changes...") */
  statusText: string;

  /** 并发安全：只读工具可并行执行 */
  isConcurrencySafe: boolean;

  /** 是否为破坏性操作 (修改文件/状态) */
  isDestructive: boolean;

  /** 执行工具 */
  call(args: any, context: ToolContext): Promise<ToolResult>;
}
