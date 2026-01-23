import React from 'react';
import { FileHistory } from '../../types';

interface HistoryPanelProps {
  history: FileHistory[];
  onRevert: (entry: FileHistory) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onRevert }) => {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-none p-4 border-b border-erp-100 bg-erp-50/50">
        <h3 className="text-xs font-semibold text-erp-500 uppercase tracking-wider mb-1">Audit Log</h3>
        <p className="text-[10px] text-erp-400">Snapshot history of file changes.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-erp-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 mb-2 opacity-50"
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
            <span className="text-xs">No history yet</span>
          </div>
        ) : (
          <div className="relative border-l-2 border-erp-100 ml-4 my-2 space-y-6">
            {history.map((entry) => (
              <div key={entry.id} className="relative pl-6">
                {/* Timeline Dot */}
                <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-erp-200 border-2 border-white"></div>

                <div className="bg-white border border-erp-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] text-erp-400 font-mono">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-erp-800 mb-2">{entry.description}</div>
                  <button
                    onClick={() => {
                      if (
                        window.confirm('Are you sure you want to revert to this version? Current changes will be lost.')
                      ) {
                        onRevert(entry);
                      }
                    }}
                    className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium px-2 py-1 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                      />
                    </svg>
                    Revert to here
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;
