import { useSettings } from './useSettings';
import { useFileProject } from './useFileProject';
import { useAgentChat } from './useAgentChat';

/**
 * useFormBuilder (Main Facade Hook)
 *
 * Aggregates logic from:
 * 1. useSettings - API Keys & Preferences
 * 2. useFileProject - Files, Content, History
 * 3. useAgentChat - Gemini LLM, Tool Execution
 */
export const useFormBuilder = () => {
  // 1. Settings
  const { settings, updateSettings } = useSettings();

  // 2. File & Project State
  const {
    files,
    activeFileId,
    activeFile,
    history,
    setActiveFileId,
    updateFileContent,
    createNewFile,
    revertToHistory,
    revertToLatestHistory,
    getActiveFile, // Helper for Agent
    getAllFiles,
  } = useFileProject();

  // 3. Agent & Chat State (Needs access to File & Settings)
  const {
    messages, tasks, isLoading, sendMessage, setPreviewSnapshot, notifyPreviewSnapshotError,
    hasResumableSession, resumeSession, clearSession,
  } = useAgentChat({
    settings,
    getActiveFile,
    getAllFiles,
    updateFileContent,
    revertToLatestHistory,
  });

  return {
    // Chat & Agent
    messages,
    tasks,
    isLoading,
    sendMessage,
    setPreviewSnapshot,
    notifyPreviewSnapshotError,
    hasResumableSession,
    resumeSession,
    clearSession,

    // File System
    files,
    activeFileId,
    activeFile,
    history,
    setActiveFileId,
    createNewFile,
    updateFileContent,
    revertToHistory,
    revertToLatestHistory,

    // Settings
    settings,
    updateSettings,
  };
};
