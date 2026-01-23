import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { AgentTask, Message, ProjectFile } from '../../types';
import type { GeminiService } from '../../services/geminiService';

export interface ConversationHandlerDependencies {
  geminiServiceRef: MutableRefObject<GeminiService | null>;
  getActiveFile: () => ProjectFile;
  getAllFiles: () => ProjectFile[];
  updateFileContent: (content: string, description: string) => void;
  revertToLatestHistory: () => boolean;
  diffCheckEnabled: boolean;
  requestPreviewSnapshot: () => void;
  tasksRef: MutableRefObject<AgentTask[]>;
  referenceImageRef: MutableRefObject<{ mimeType: string; data: string } | undefined>;
  previewImageRef: MutableRefObject<{ mimeType: string; data: string } | undefined>;
  waitForNextPreviewSnapshot: (timeoutMs?: number) => Promise<void>;
  setTasks: Dispatch<SetStateAction<AgentTask[]>>;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setBotStatus: (status: string | undefined) => void;
}
