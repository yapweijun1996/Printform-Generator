
import React, { useState, useCallback, useEffect } from 'react';
import ChatPanel from './components/Chat/ChatPanel';
import FormPreview from './components/Preview/FormPreview';
import FileExplorer from './components/Sidebar/FileExplorer';
import TaskPanel from './components/Sidebar/TaskPanel';
import HistoryPanel from './components/Sidebar/HistoryPanel';
import CodeEditor from './components/Editor/CodeEditor';
import SettingsModal from './components/Settings/SettingsModal';
import { useFormBuilder } from './hooks/useFormBuilder';
import { ViewMode, SidebarTab } from './types';

const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 600;

const App: React.FC = () => {
  const { 
    messages, 
    files,
    activeFileId,
    activeFile,
    tasks,
    history,
    isLoading, 
    sendMessage,
    setActiveFileId,
    createNewFile,
    updateFileContent,
    revertToHistory,
    settings,
    updateSettings
  } = useFormBuilder();

  // Layout State
  const [activeTab, setActiveTab] = useState<SidebarTab>('chat');
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Auto-open settings if no key
  useEffect(() => {
    if (!settings.apiKey) {
        setIsSettingsOpen(true);
    }
  }, []);

  const handleSend = (image?: { mimeType: string; data: string }) => {
    sendMessage(input, image);
    setInput('');
  };

  const [input, setInput] = useState('');

  // Resize Handlers
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, e.clientX));
      setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }
    return () => {
        window.removeEventListener('mousemove', resize);
        window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);


  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans text-erp-800 bg-erp-50">
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onSave={updateSettings}
      />

      {/* 1. LEFT PANEL: Control Center */}
      <div 
        style={{ width: sidebarWidth }} 
        className="flex-none flex flex-col bg-white border-r border-erp-200 z-20 shadow-xl"
      >
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    {tasks.filter(t => t.status !== 'completed').length > 0 && (
                        <span className="absolute -top-1 -right-2 bg-blue-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">
                            {tasks.filter(t => t.status !== 'completed').length}
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-hidden relative">
            {activeTab === 'chat' && (
                <ChatPanel 
                    messages={messages} 
                    input={input} 
                    setInput={setInput} 
                    onSend={handleSend}
                    isLoading={isLoading}
                />
            )}
            {activeTab === 'plan' && (
                <TaskPanel tasks={tasks} />
            )}
            {activeTab === 'files' && (
                <FileExplorer 
                    files={files}
                    activeFileId={activeFileId}
                    onSelectFile={setActiveFileId}
                    onNewFile={() => createNewFile(`form-${files.length + 1}.html`, '')}
                />
            )}
            {activeTab === 'history' && (
                <HistoryPanel 
                    history={history}
                    onRevert={revertToHistory}
                />
            )}
        </div>

        {/* Sidebar Footer: Settings */}
        <div className="flex-none p-3 border-t border-erp-200 bg-erp-50">
            <button 
                onClick={() => setIsSettingsOpen(true)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-md border transition-colors ${
                    !settings.apiKey 
                    ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' 
                    : 'bg-white text-erp-600 border-erp-200 hover:border-erp-300 hover:shadow-sm'
                }`}
            >
                <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{settings.apiKey ? 'Settings Configured' : 'Configure API Key'}</span>
                </div>
                {!settings.apiKey && <span className="font-bold">!</span>}
            </button>
        </div>
      </div>

      {/* Resizer Handle */}
      <div
        onMouseDown={startResizing}
        className={`w-1 hover:w-1.5 z-30 cursor-col-resize hover:bg-blue-400 transition-colors flex-none shadow-sm ${isResizing ? 'bg-blue-500' : 'bg-erp-300'}`}
      />

      {/* 2. RIGHT PANEL: Work Area (Preview & Code) */}
      <div className="flex-1 flex flex-col min-w-0 bg-erp-100">
        
        {/* Top Navigation Bar */}
        <div className="h-12 bg-white flex items-center justify-between px-4 border-b border-erp-200 shadow-sm flex-none z-10">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-erp-800">
                   <div className="p-1.5 bg-blue-100 rounded text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                   </div>
                   <span className="font-bold text-sm tracking-tight">{activeFile.name}</span>
                   {isLoading && (
                       <span className="ml-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-medium border border-blue-100">
                           <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                           AI Processing...
                       </span>
                   )}
                </div>
            </div>

            <div className="flex items-center bg-erp-100 p-0.5 rounded-lg border border-erp-200">
                <button 
                    onClick={() => setViewMode('preview')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        viewMode === 'preview' ? 'bg-white text-erp-900 shadow-sm' : 'text-erp-500 hover:text-erp-700'
                    }`}
                >
                    Preview
                </button>
                <button 
                    onClick={() => setViewMode('split')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        viewMode === 'split' ? 'bg-white text-erp-900 shadow-sm' : 'text-erp-500 hover:text-erp-700'
                    }`}
                >
                    Split
                </button>
                <button 
                    onClick={() => setViewMode('code')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        viewMode === 'code' ? 'bg-white text-erp-900 shadow-sm' : 'text-erp-500 hover:text-erp-700'
                    }`}
                >
                    Code
                </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
            {/* Preview Pane */}
            <div 
                className={`transition-all duration-300 absolute inset-0 ${
                    viewMode === 'code' ? 'translate-x-full opacity-0 z-0' : 'translate-x-0 opacity-100 z-10'
                } ${viewMode === 'split' ? 'w-1/2 right-0 left-auto border-l border-erp-300' : 'w-full'}`}
            >
                <FormPreview 
                    htmlContent={activeFile.content} 
                    pageWidth={settings.pageWidth}
                    pageHeight={settings.pageHeight}
                />
            </div>

            {/* Editor Pane */}
            <div 
                className={`transition-all duration-300 absolute inset-0 ${
                    viewMode === 'preview' ? '-translate-x-full opacity-0 z-0' : 'translate-x-0 opacity-100 z-10'
                } ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}
            >
                <CodeEditor 
                    code={activeFile.content} 
                    onChange={(val) => updateFileContent(val, "Manual Edit")} 
                />
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;
