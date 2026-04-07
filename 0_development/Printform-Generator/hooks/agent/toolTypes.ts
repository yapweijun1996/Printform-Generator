import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { AgentTask, ProjectFile } from '../../types';

export interface ToolExecutionResult {
  success: boolean;
  output: string;
  updatedContent?: string;
  /** Structured artifacts from tool execution */
  artifacts?: Record<string, any>;
  /** State changes communicated by the tool */
  stateDelta?: Record<string, any>;
  /** Hints for the model about what to do next */
  followupHints?: string[];
}

export interface ToolExecutorDependencies {
  getActiveFile: () => ProjectFile;
  getAllFiles: () => ProjectFile[];
  updateFileContent: (content: string, description: string) => void;
  revertToLatestHistory: () => boolean;
  tasksRef: MutableRefObject<AgentTask[]>;
  setTasks: Dispatch<SetStateAction<AgentTask[]>>;
}
