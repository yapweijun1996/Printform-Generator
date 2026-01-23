import React from 'react';
import ChatPanel from '../Chat/ChatPanel';
import TaskPanel from '../Sidebar/TaskPanel';
import FileExplorer from '../Sidebar/FileExplorer';
import HistoryPanel from '../Sidebar/HistoryPanel';
import AuditLogPanel from '../Sidebar/AuditLogPanel';
import { SidebarTab, Message, AgentTask, ProjectFile, FileHistory, UserSettings } from '../../types';

interface SidebarProps {
  width: number;
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  messages: Message[];
  tasks: AgentTask[];
  files: ProjectFile[];
  activeFileId: string;
  history: FileHistory[];
  input: string;
  setInput: (input: string) => void;
  onSend: (image?: { mimeType: string; data: string }) => void;
  isLoading: boolean;
  onSelectFile: (id: string) => void;
  onNewFile: () => void;
  onRevert: (entry: FileHistory) => void;
  settings: UserSettings;
  onOpenSettings: () => void;
}

/**
 * 左侧边栏组件
 * 包含 Chat、Plan、Files、History 四个标签页
 */
const Sidebar: React.FC<SidebarProps> = ({
  width,
  activeTab,
  setActiveTab,
  messages,
  tasks,
  files,
  activeFileId,
  history,
  input,
  setInput,
  onSend,
  isLoading,
  onSelectFile,
  onNewFile,
  onRevert,
  settings,
  onOpenSettings,
}) => {
  return (
    <div style={{ width }} className="flex-none flex flex-col bg-white border-r border-erp-200 z-20 shadow-xl">
      {/* Sidebar Tabs */}
      <div className="flex-none flex border-b border-erp-200 bg-erp-50">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center border-b-2 transition-colors ${
            activeTab === 'chat'
              ? 'border-erp-800 text-erp-900 bg-white'
              : 'border-transparent text-erp-500 hover:text-erp-700 hover:bg-erp-100'
          }`}
          title="AI Assistant"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>
        <button
          onClick={() => setActiveTab('plan')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center border-b-2 transition-colors ${
            activeTab === 'plan'
              ? 'border-erp-800 text-erp-900 bg-white'
              : 'border-transparent text-erp-500 hover:text-erp-700 hover:bg-erp-100'
          }`}
          title="Project Plan / Tasks"
        >
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            {tasks.filter((t) => t.status !== 'completed').length > 0 && (
              <span className="absolute -top-1 -right-2 bg-blue-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {tasks.filter((t) => t.status !== 'completed').length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center border-b-2 transition-colors ${
            activeTab === 'files'
              ? 'border-erp-800 text-erp-900 bg-white'
              : 'border-transparent text-erp-500 hover:text-erp-700 hover:bg-erp-100'
          }`}
          title="Files"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-erp-800 text-erp-900 bg-white'
              : 'border-transparent text-erp-500 hover:text-erp-700 hover:bg-erp-100'
          }`}
          title="Audit Log / History"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center border-b-2 transition-colors ${
            activeTab === 'audit'
              ? 'border-erp-800 text-erp-900 bg-white'
              : 'border-transparent text-erp-500 hover:text-erp-700 hover:bg-erp-100'
          }`}
          title="Audit Log"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </button>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'chat' && (
          <ChatPanel messages={messages} input={input} setInput={setInput} onSend={onSend} isLoading={isLoading} />
        )}
        {activeTab === 'plan' && <TaskPanel tasks={tasks} />}
        {activeTab === 'files' && (
          <FileExplorer files={files} activeFileId={activeFileId} onSelectFile={onSelectFile} onNewFile={onNewFile} />
        )}
        {activeTab === 'history' && <HistoryPanel history={history} onRevert={onRevert} />}
        {activeTab === 'audit' && <AuditLogPanel />}
      </div>

      {/* Sidebar Footer: Settings */}
      <div className="flex-none p-3 border-t border-erp-200 bg-erp-50">
        <button
          onClick={onOpenSettings}
          className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-md border transition-colors ${
            !settings.apiKey
              ? 'bg-red-50 text-red-600 border-red-200 animate-pulse'
              : 'bg-white text-erp-600 border-erp-200 hover:border-erp-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{settings.apiKey ? 'Settings Configured' : 'Configure API Key'}</span>
          </div>
          {!settings.apiKey && <span className="font-bold">!</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
