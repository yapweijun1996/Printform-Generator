import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { AgentTask, ProjectFile } from '../../types';

export interface ToolExecutionResult {
  success: boolean;
  output: string;
  updatedContent?: string;
}

export interface ToolExecutorDependencies {
  getActiveFile: () => ProjectFile;
  getAllFiles: () => ProjectFile[];
  updateFileContent: (content: string, description: string) => void;
  revertToLatestHistory: () => boolean;
  tasksRef: MutableRefObject<AgentTask[]>;
  setTasks: Dispatch<SetStateAction<AgentTask[]>>;
}
