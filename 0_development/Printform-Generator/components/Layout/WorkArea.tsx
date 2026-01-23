import React from 'react';
import FormPreview from '../Preview/FormPreview';
import CodeEditor from '../Editor/CodeEditor';
import { ViewMode, ProjectFile } from '../../types';

interface WorkAreaProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  activeFile: ProjectFile;
  isLoading: boolean;
  pageWidth: string;
  pageHeight: string;
  onCodeChange: (code: string) => void;
  onPreviewSnapshot?: (image: { mimeType: string; data: string }) => void;
  onPreviewSnapshotError?: (reason: string) => void;
}

/**
 * 右侧工作区组件
 * 包含顶部导航栏和预览/代码编辑区域
 */
const WorkArea: React.FC<WorkAreaProps> = ({
  viewMode,
  setViewMode,
  activeFile,
  isLoading,
  pageWidth,
  pageHeight,
  onCodeChange,
  onPreviewSnapshot,
  onPreviewSnapshotError,
}) => {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-erp-100">
      {/* Top Navigation Bar */}
      <div className="h-12 bg-white flex items-center justify-between px-4 border-b border-erp-200 shadow-sm flex-none z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-erp-800">
            <div className="p-1.5 bg-blue-100 rounded text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                  clipRule="evenodd"
                />
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
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            onPreviewSnapshot={onPreviewSnapshot}
            onPreviewSnapshotError={onPreviewSnapshotError}
          />
        </div>

        {/* Editor Pane */}
        <div
          className={`transition-all duration-300 absolute inset-0 ${
            viewMode === 'preview' ? '-translate-x-full opacity-0 z-0' : 'translate-x-0 opacity-100 z-10'
          } ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}
        >
          <CodeEditor code={activeFile.content} onChange={onCodeChange} />
        </div>
      </div>
    </div>
  );
};

export default WorkArea;
