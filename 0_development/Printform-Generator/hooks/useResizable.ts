import { useState, useCallback, useEffect } from 'react';

/**
 * 可调整大小的 Hook
 * 用于实现拖拽调整侧边栏宽度的功能
 */
export const useResizable = (initialWidth: number, minWidth: number, maxWidth: number) => {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback(() => setIsResizing(true), []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = Math.max(minWidth, Math.min(maxWidth, window.innerWidth - e.clientX));
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      // Prevent text selection during resize
      document.body.style.pointerEvents = 'none';
    } else {
      // Restore normal behavior
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      // Ensure cleanup on unmount
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';
    };
  }, [isResizing, minWidth, maxWidth]);

  return {
    width,
    isResizing,
    startResizing,
  };
};
