import { useState } from 'react';
import { SidebarTab, ViewMode } from '../types';

/**
 * 布局状态管理 Hook
 * 管理侧边栏标签页和视图模式的状态
 */
export const useLayoutState = () => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('chat');
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return {
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    isSettingsOpen,
    setIsSettingsOpen,
  };
};
