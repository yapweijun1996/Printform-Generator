import React, { useState, useEffect } from 'react';
import SettingsModal from './components/Settings/SettingsModal';
import Sidebar from './components/Layout/Sidebar';
import WorkArea from './components/Layout/WorkArea';
import ResizeHandle from './components/Layout/ResizeHandle';
import { useFormBuilder } from './hooks/useFormBuilder';
import { useResizable } from './hooks/useResizable';
import { useLayoutState } from './hooks/useLayoutState';

const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 600;
const INITIAL_SIDEBAR_WIDTH = 350;

/**
 * 主应用组件
 * 组合所有子组件和 Hooks,管理整体布局
 */
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
    updateSettings,
    setPreviewSnapshot,
    notifyPreviewSnapshotError,
  } = useFormBuilder();

  const {
    width: sidebarWidth,
    isResizing,
    startResizing,
  } = useResizable(INITIAL_SIDEBAR_WIDTH, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH);

  const { activeTab, setActiveTab, viewMode, setViewMode, isSettingsOpen, setIsSettingsOpen } = useLayoutState();

  const [input, setInput] = useState('');

  // 自动打开设置(如果没有 API Key)
  useEffect(() => {
    if (!settings.apiKey) {
      setIsSettingsOpen(true);
    }
  }, [settings.apiKey, setIsSettingsOpen]);

  const handleSend = (image?: { mimeType: string; data: string }) => {
    sendMessage(input, image);
    setInput('');
  };

  const handleCodeChange = (code: string) => {
    updateFileContent(code, 'Manual Edit');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans text-erp-800 bg-erp-50">
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={updateSettings}
        activeHtmlContent={activeFile?.content || ''}
      />

      {/* 左侧工作区 */}
      <WorkArea
        viewMode={viewMode}
        setViewMode={setViewMode}
        activeFile={activeFile}
        isLoading={isLoading}
        pageWidth={settings.pageWidth}
        pageHeight={settings.pageHeight}
        onCodeChange={handleCodeChange}
        onPreviewSnapshot={setPreviewSnapshot}
        onPreviewSnapshotError={notifyPreviewSnapshotError}
      />

      {/* 拖拽调整手柄 */}
      <ResizeHandle onMouseDown={startResizing} isResizing={isResizing} />

      {/* 右侧边栏 */}
      <Sidebar
        width={sidebarWidth}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        messages={messages}
        tasks={tasks}
        files={files}
        activeFileId={activeFileId}
        history={history}
        input={input}
        setInput={setInput}
        onSend={handleSend}
        isLoading={isLoading}
        onSelectFile={setActiveFileId}
        onNewFile={() => createNewFile(`form-${files.length + 1}.html`, '')}
        onRevert={revertToHistory}
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
    </div>
  );
};

export default App;
