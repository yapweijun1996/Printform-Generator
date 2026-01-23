
import { useState, useCallback } from 'react';
import { ProjectFile, FileHistory } from '../types';
import { INITIAL_HTML } from '../utils/templates';

export const useFileProject = () => {
  const [files, setFiles] = useState<ProjectFile[]>([
    {
      id: 'default',
      name: 'invoice-template.html',
      language: 'html',
      content: INITIAL_HTML,
      updatedAt: Date.now()
    }
  ]);

  const [history, setHistory] = useState<FileHistory[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>('default');

  const getActiveFile = useCallback(() => {
    return files.find(f => f.id === activeFileId) || files[0];
  }, [files, activeFileId]);

  const updateFileContent = useCallback((newContent: string, description: string = "Manual Edit") => {
    const currentFile = getActiveFile();
    
    // Save snapshot to history
    const newHistoryEntry: FileHistory = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        description: description,
        content: currentFile.content
    };
    setHistory(prev => [newHistoryEntry, ...prev]);

    // Update File
    setFiles(prev => prev.map(f => 
      f.id === activeFileId ? { ...f, content: newContent, updatedAt: Date.now() } : f
    ));
  }, [activeFileId, getActiveFile]);

  const revertToHistory = useCallback((historyEntry: FileHistory) => {
     updateFileContent(historyEntry.content, `Reverted to: ${historyEntry.description}`);
  }, [updateFileContent]);

  const createNewFile = useCallback((name: string, content: string) => {
    const newFile: ProjectFile = {
      id: Date.now().toString(),
      name,
      language: 'html',
      content: content || INITIAL_HTML,
      updatedAt: Date.now()
    };
    setFiles(prev => [newFile, ...prev]);
    setActiveFileId(newFile.id);
  }, []);

  return {
    files,
    activeFileId,
    activeFile: getActiveFile(),
    history,
    setActiveFileId,
    updateFileContent,
    createNewFile,
    revertToHistory,
    getActiveFile // Exposed for the Agent to call imperatively
  };
};
