import { useState, useRef, useEffect, useCallback } from 'react';
import { Message, Sender, AgentTask, UserSettings, ProjectFile } from '../types';
import { GeminiService } from '../services/geminiService';
import { runAgentLoop } from './agent/agentLoop';
import { hasRecoverableSession, clearPersistedSession } from './agent/sessionManager';

interface UseAgentChatProps {
  settings: UserSettings;
  getActiveFile: () => ProjectFile;
  getAllFiles: () => ProjectFile[];
  updateFileContent: (content: string, description: string) => void;
  revertToLatestHistory: () => boolean;
}

/**
 * AI Agent Chat Hook
 * 管理聊天消息、任务列表和与 Gemini AI 的交互
 */
export const useAgentChat = ({
  settings,
  getActiveFile,
  getAllFiles,
  updateFileContent,
  revertToLatestHistory,
}: UseAgentChatProps) => {
  // 状态管理
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: Sender.Bot,
      text: 'Hello! I am your ERP Form Copilot. I use strict `<colgroup>` logic and inline styles for print safety. How can I help you today?',
      timestamp: Date.now(),
    },
  ]);

  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const tasksRef = useRef<AgentTask[]>([]);
  const geminiServiceRef = useRef<GeminiService | null>(null);
  const referenceImageRef = useRef<{ mimeType: string; data: string } | undefined>(undefined);
  const previewImageRef = useRef<{ mimeType: string; data: string } | undefined>(undefined);
  const previewWaitersRef = useRef<Array<() => void>>([]);
  const previewVersionRef = useRef(0);
  const previewErrorCountRef = useRef(0);
  const previewWarnedRef = useRef(false);
  const autoLoopGuardRef = useRef({ noToolStreak: 0, lastNoToolResponseKey: '' });
  const lastToolResultRef = useRef<{ success: boolean; output: string; toolName: string } | undefined>(undefined);

  // 同步任务状态到 ref
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // 当设置变化时重新初始化服务
  useEffect(() => {
    geminiServiceRef.current = new GeminiService(
      settings.apiKey,
      settings.model,
      settings.activeTools,
      settings.pageWidth,
      settings.pageHeight,
      {
        semanticRagEnabled: Boolean(settings.semanticRagEnabled),
        semanticRagTopK: Number.isFinite(settings.semanticRagTopK) ? settings.semanticRagTopK : 4,
      },
    );
  }, [
    settings.apiKey,
    settings.model,
    settings.activeTools,
    settings.pageWidth,
    settings.pageHeight,
    settings.semanticRagEnabled,
    settings.semanticRagTopK,
  ]);

  // 更新最后一条机器人消息的状态文本
  const setBotStatus = useCallback((status: string | undefined) => {
    setMessages((prev) => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.sender === Sender.Bot) {
        return prev.map((msg, i) => (i === prev.length - 1 ? { ...msg, statusText: status } : msg));
      }
      return prev;
    });
  }, []);

  const setPreviewSnapshot = useCallback((image: { mimeType: string; data: string }) => {
    previewImageRef.current = image;
    previewVersionRef.current += 1;
    previewErrorCountRef.current = 0;
    previewWarnedRef.current = false;
    const waiters = previewWaitersRef.current;
    previewWaitersRef.current = [];
    waiters.forEach((fn) => fn());
  }, []);

  const notifyPreviewSnapshotError = useCallback(
    (reason: string) => {
      previewErrorCountRef.current += 1;
      if (!previewWarnedRef.current && previewErrorCountRef.current >= 3) {
        previewWarnedRef.current = true;
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: Sender.Bot,
            text: `Preview snapshot failed repeatedly (${reason}). I will continue using the reference image and current code context.`,
            timestamp: Date.now(),
          },
        ]);
      }
    },
    [setMessages],
  );

  const getPreviewSnapshotVersion = useCallback(() => previewVersionRef.current, []);

  const waitForNextPreviewSnapshot = useCallback((timeoutMs: number = 1500, minVersion?: number) => {
    return new Promise<boolean>((resolve) => {
      const baseline = typeof minVersion === 'number' ? minVersion : previewVersionRef.current;
      if (previewVersionRef.current > baseline) {
        resolve(true);
        return;
      }

      const timer = window.setTimeout(() => resolve(false), timeoutMs);
      previewWaitersRef.current.push(() => {
        window.clearTimeout(timer);
        resolve(true);
      });
    });
  }, []);

  // Check for recoverable session on mount
  const [hasResumableSession, setHasResumableSession] = useState(false);
  useEffect(() => {
    hasRecoverableSession().then(setHasResumableSession);
  }, []);

  // Resume last session
  const resumeSession = useCallback(async () => {
    if (!settings.apiKey) return;
    setIsLoading(true);
    setHasResumableSession(false);
    await runAgentLoop('Resume previous session.', undefined, {
      geminiServiceRef,
      getActiveFile,
      getAllFiles,
      updateFileContent,
      revertToLatestHistory,
      activeTools: settings.activeTools || [],
      pageWidth: settings.pageWidth,
      pageHeight: settings.pageHeight,
      minRowItemsForPaginationTest: settings.minRowItemsForPaginationTest ?? 70,
      diffCheckEnabled: (settings.activeTools || []).includes('diff_check'),
      autoApplyDiff: Boolean(settings.autoApplyDiff),
      strictPreviewGate: Boolean(settings.strictPreviewGate),
      requestPreviewSnapshot: (opts) => {
        try {
          window.dispatchEvent(new CustomEvent('formpreview:request_snapshot', { detail: opts }));
        } catch { /* ignore */ }
      },
      getPreviewSnapshotVersion,
      tasksRef,
      referenceImageRef,
      previewImageRef,
      waitForNextPreviewSnapshot,
      setTasks,
      setMessages,
      setIsLoading,
      setBotStatus,
      autoLoopGuardRef,
      lastToolResultRef,
    }, { tryRestore: true });
  }, [settings, getActiveFile, getAllFiles, updateFileContent, revertToLatestHistory, getPreviewSnapshotVersion, setBotStatus, waitForNextPreviewSnapshot]);

  // Clear persisted session
  const clearSession = useCallback(async () => {
    await clearPersistedSession();
    setHasResumableSession(false);
    setTasks([]);
  }, []);

  // 发送消息的公共接口
  const sendMessage = useCallback(
    async (text: string, image?: { mimeType: string; data: string }) => {
      if (!text.trim() && !image) return;

      // 检查 API Key
      if (!settings.apiKey) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: Sender.Bot,
            text: 'Please configure your Google Gemini API Key in Settings (⚙️) to continue.',
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      // 添加用户消息
      const userMessage: Message = {
        id: Date.now().toString(),
        sender: Sender.User,
        text: text,
        timestamp: Date.now(),
        attachment: image,
      };
      setMessages((prev) => [...prev, userMessage]);

      setIsLoading(true);

      // Full-auto multi-step: keep the last uploaded reference image for all subsequent task turns
      if (image) referenceImageRef.current = image;

      // 开始 Agent Loop (while-loop 模式)
      await runAgentLoop(text, image, {
        geminiServiceRef,
        getActiveFile,
        getAllFiles,
        updateFileContent,
        revertToLatestHistory,
        activeTools: settings.activeTools || [],
        pageWidth: settings.pageWidth,
        pageHeight: settings.pageHeight,
        minRowItemsForPaginationTest: settings.minRowItemsForPaginationTest ?? 70,
        diffCheckEnabled: (settings.activeTools || []).includes('diff_check'),
        autoApplyDiff: Boolean(settings.autoApplyDiff),
        strictPreviewGate: Boolean(settings.strictPreviewGate),
        requestPreviewSnapshot: (opts) => {
          try {
            window.dispatchEvent(new CustomEvent('formpreview:request_snapshot', { detail: opts }));
          } catch {
            // ignore
          }
        },
        getPreviewSnapshotVersion,
        tasksRef,
        referenceImageRef,
        previewImageRef,
        waitForNextPreviewSnapshot,
        setTasks,
        setMessages,
        setIsLoading,
        setBotStatus,
        autoLoopGuardRef,
        lastToolResultRef,
      });
    },
    [
      settings,
      getActiveFile,
      getAllFiles,
      updateFileContent,
      revertToLatestHistory,
      getPreviewSnapshotVersion,
      setBotStatus,
      waitForNextPreviewSnapshot,
    ],
  );

  return {
    messages,
    tasks,
    isLoading,
    sendMessage,
    setPreviewSnapshot,
    notifyPreviewSnapshotError,
    hasResumableSession,
    resumeSession,
    clearSession,
  };
};
