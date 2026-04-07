import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { AgentTask, Message, ProjectFile } from '../../types';
import type { GeminiService } from '../../services/geminiService';
import type { LoopGuardState } from './sessionManager';

export interface AutoLoopGuardState {
  noToolStreak: number;
  lastNoToolResponseKey: string;
}

/** Captured tool result for session persistence (set by toolCallFlow, read by agentLoop) */
export interface CapturedToolResult {
  success: boolean;
  output: string;
  toolName: string;
}

export interface ConversationHandlerDependencies {
  geminiServiceRef: MutableRefObject<GeminiService | null>;
  getActiveFile: () => ProjectFile;
  getAllFiles: () => ProjectFile[];
  updateFileContent: (content: string, description: string) => void;
  revertToLatestHistory: () => boolean;
  activeTools: string[];
  pageWidth: string;
  pageHeight: string;
  minRowItemsForPaginationTest: number;
  diffCheckEnabled: boolean;
  autoApplyDiff: boolean;
  strictPreviewGate: boolean;
  requestPreviewSnapshot: (opts?: { scale?: number; jpegQuality?: number }) => void;
  getPreviewSnapshotVersion: () => number;
  tasksRef: MutableRefObject<AgentTask[]>;
  referenceImageRef: MutableRefObject<{ mimeType: string; data: string } | undefined>;
  previewImageRef: MutableRefObject<{ mimeType: string; data: string } | undefined>;
  waitForNextPreviewSnapshot: (timeoutMs?: number, minVersion?: number) => Promise<boolean>;
  setTasks: Dispatch<SetStateAction<AgentTask[]>>;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setBotStatus: (status: string | undefined) => void;
  autoLoopGuardRef: MutableRefObject<AutoLoopGuardState>;
  /** Mutable ref for toolCallFlow to deposit the actual tool execution result */
  lastToolResultRef: MutableRefObject<CapturedToolResult | undefined>;
}
