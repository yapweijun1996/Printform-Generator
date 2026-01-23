
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
    getActiveFile // Helper for Agent
  } = useFileProject();

  // 3. Agent & Chat State (Needs access to File & Settings)
  const {
    messages,
    tasks,
    isLoading,
    sendMessage
  } = useAgentChat({
    settings,
    getActiveFile,
    updateFileContent
  });

  return {
    // Chat & Agent
    messages,
    tasks,
    isLoading,
    sendMessage,
    
    // File System
    files,
    activeFileId,
    activeFile,
    history,
    setActiveFileId,
    createNewFile,
    updateFileContent,
    revertToHistory,

    // Settings
    settings,
    updateSettings
  };
};
