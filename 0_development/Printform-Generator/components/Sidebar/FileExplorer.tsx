import React from 'react';
import { ProjectFile } from '../../types';

interface FileExplorerProps {
  files: ProjectFile[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onNewFile: () => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ files, activeFileId, onSelectFile, onNewFile }) => {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-none p-3 border-b border-erp-100 flex justify-between items-center bg-erp-50/50">
        <span className="text-xs font-semibold text-erp-500 uppercase tracking-wider">Project Files</span>
        <button
          onClick={onNewFile}
          className="p-1 hover:bg-white hover:shadow-sm rounded text-erp-600 transition-all border border-transparent hover:border-erp-200"
          title="New File"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {files.map((file) => (
            <button
              key={file.id}
              onClick={() => onSelectFile(file.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-sm transition-all group border ${
                activeFileId === file.id
                  ? 'bg-blue-50 border-blue-100 text-blue-900 shadow-sm'
                  : 'bg-white border-transparent text-erp-600 hover:bg-erp-50 hover:border-erp-100'
              }`}
            >
              <div
                className={`p-1.5 rounded ${activeFileId === file.id ? 'bg-blue-200 text-blue-700' : 'bg-erp-100 text-erp-400 group-hover:bg-white'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{file.name}</div>
                <div className="text-[10px] text-erp-400 truncate">{new Date(file.updatedAt).toLocaleTimeString()}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FileExplorer;
