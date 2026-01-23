import { useEffect, useRef, useState, useCallback } from 'react';
import { ProjectFile, FileHistory } from '../types';
import { INITIAL_HTML } from '../utils/templates';
import { clearProjectState, loadProjectState, saveProjectState } from '../utils/persistedProject';

export const useFileProject = () => {
  const [files, setFiles] = useState<ProjectFile[]>([
    {
      id: 'default',
      name: 'invoice-template.html',
      language: 'html',
      content: INITIAL_HTML,
      updatedAt: Date.now(),
    },
  ]);

  const [history, setHistory] = useState<FileHistory[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>('default');
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const getActiveFile = useCallback(() => {
    return files.find((f) => f.id === activeFileId) || files[0];
  }, [files, activeFileId]);

  const getAllFiles = useCallback(() => {
    return files;
  }, [files]);

  const getHistory = useCallback(() => {
    return history;
  }, [history]);

  // Hydrate project state from IndexedDB (best-effort)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const persisted = await loadProjectState();
      if (!persisted || cancelled) {
        hydratedRef.current = true;
        return;
      }

      setFiles(persisted.files);
      setHistory(persisted.history || []);
      setActiveFileId(persisted.activeFileId || persisted.files[0]?.id || 'default');
      hydratedRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist project state to IndexedDB (debounced)
  useEffect(() => {
    if (!hydratedRef.current) return;

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveProjectState({ files, activeFileId, history });
    }, 400);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [files, activeFileId, history]);

  const updateFileContent = useCallback(
    (newContent: string, description: string = 'Manual Edit') => {
      const currentFile = getActiveFile();

      // Save snapshot to history
      const newHistoryEntry: FileHistory = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        description: description,
        content: currentFile.content,
      };
      setHistory((prev) => [newHistoryEntry, ...prev]);

      // Update File
      setFiles((prev) =>
        prev.map((f) => (f.id === activeFileId ? { ...f, content: newContent, updatedAt: Date.now() } : f)),
      );
    },
    [activeFileId, getActiveFile],
  );

  const revertToHistory = useCallback(
    (historyEntry: FileHistory) => {
      updateFileContent(historyEntry.content, `Reverted to: ${historyEntry.description}`);
    },
    [updateFileContent],
  );

  const revertToLatestHistory = useCallback(() => {
    const latest = history[0];
    if (!latest) return false;
    updateFileContent(latest.content, `Undo: ${latest.description}`);
    return true;
  }, [history, updateFileContent]);

  const createNewFile = useCallback((name: string, content: string) => {
    const newFile: ProjectFile = {
      id: Date.now().toString(),
      name,
      language: 'html',
      content: content || INITIAL_HTML,
      updatedAt: Date.now(),
    };
    setFiles((prev) => [newFile, ...prev]);
    setActiveFileId(newFile.id);
  }, []);

  const resetProject = useCallback(async () => {
    await clearProjectState();
    const now = Date.now();
    const defaultFile: ProjectFile = {
      id: 'default',
      name: 'invoice-template.html',
      language: 'html',
      content: INITIAL_HTML,
      updatedAt: now,
    };
    setFiles([defaultFile]);
    setHistory([]);
    setActiveFileId('default');
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
    revertToLatestHistory,
    resetProject,
    getActiveFile, // Exposed for the Agent to call imperatively
    getAllFiles,
    getHistory,
  };
};
