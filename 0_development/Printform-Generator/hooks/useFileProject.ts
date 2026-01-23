import { useEffect, useRef, useState, useCallback } from 'react';
import { ProjectFile, FileHistory } from '../types';
import { INITIAL_HTML } from '../utils/templates';
import { clearProjectState, loadProjectState, saveProjectState } from '../utils/persistedProject';

export const useFileProject = () => {
  const initialFiles: ProjectFile[] = [
    {
      id: 'default',
      name: 'invoice-template.html',
      language: 'html',
      content: INITIAL_HTML,
      updatedAt: Date.now(),
    },
  ];
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles);
  const filesRef = useRef<ProjectFile[]>(initialFiles);

  const [history, setHistory] = useState<FileHistory[]>([]);
  const historyRef = useRef<FileHistory[]>([]);
  const [activeFileId, setActiveFileIdState] = useState<string>('default');
  const activeFileIdRef = useRef<string>('default');
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const getActiveFile = useCallback(() => {
    const list = filesRef.current;
    const id = activeFileIdRef.current;
    return list.find((f) => f.id === id) || list[0];
  }, []);

  const getAllFiles = useCallback(() => {
    return filesRef.current;
  }, []);

  const getHistory = useCallback(() => {
    return historyRef.current;
  }, []);

  const setActiveFileId = useCallback((id: string) => {
    activeFileIdRef.current = id;
    setActiveFileIdState(id);
  }, []);

  // Hydrate project state from IndexedDB (best-effort)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const persisted = await loadProjectState();
      if (!persisted || cancelled) {
        hydratedRef.current = true;
        return;
      }

      filesRef.current = persisted.files;
      historyRef.current = persisted.history || [];
      activeFileIdRef.current = persisted.activeFileId || persisted.files[0]?.id || 'default';
      setFiles(persisted.files);
      setHistory(persisted.history || []);
      setActiveFileIdState(activeFileIdRef.current);
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
      const nextHistory = [newHistoryEntry, ...historyRef.current];
      historyRef.current = nextHistory;
      setHistory(nextHistory);

      // Update File
      const nextFiles = filesRef.current.map((f) =>
        f.id === activeFileIdRef.current ? { ...f, content: newContent, updatedAt: Date.now() } : f,
      );
      filesRef.current = nextFiles;
      setFiles(nextFiles);
    },
    [getActiveFile],
  );

  const revertToHistory = useCallback(
    (historyEntry: FileHistory) => {
      updateFileContent(historyEntry.content, `Reverted to: ${historyEntry.description}`);
    },
    [updateFileContent],
  );

  const revertToLatestHistory = useCallback(() => {
    const latest = historyRef.current[0];
    if (!latest) return false;
    updateFileContent(latest.content, `Undo: ${latest.description}`);
    return true;
  }, [updateFileContent]);

  const createNewFile = useCallback(
    (name: string, content: string) => {
      const newFile: ProjectFile = {
        id: Date.now().toString(),
        name,
        language: 'html',
        content: content || INITIAL_HTML,
        updatedAt: Date.now(),
      };
      const next = [newFile, ...filesRef.current];
      filesRef.current = next;
      setFiles(next);
      setActiveFileId(newFile.id);
    },
    [setActiveFileId],
  );

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
    filesRef.current = [defaultFile];
    historyRef.current = [];
    activeFileIdRef.current = 'default';
    setFiles([defaultFile]);
    setHistory([]);
    setActiveFileIdState('default');
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
