import React from 'react';

interface ResizeHandleProps {
  onMouseDown: () => void;
  isResizing: boolean;
}

/**
 * 拖拽调整大小手柄组件
 * 用于调整侧边栏宽度
 */
const ResizeHandle: React.FC<ResizeHandleProps> = ({ onMouseDown, isResizing }) => {
  return (
    <div
      onMouseDown={onMouseDown}
      className={`w-1 hover:w-1.5 z-40 cursor-col-resize hover:bg-blue-400 transition-all flex-none shadow-sm ${
        isResizing ? 'bg-blue-500 w-1.5' : 'bg-erp-300'
      }`}
      style={{ minWidth: '4px' }} // Ensure minimum clickable area
    />
  );
};

export default ResizeHandle;
