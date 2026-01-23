import React from 'react';
import { AgentTask } from '../../types';

interface TaskPanelProps {
  tasks: AgentTask[];
}

const TaskPanel: React.FC<TaskPanelProps> = ({ tasks }) => {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-none p-4 border-b border-erp-100 bg-erp-50/50">
        <h3 className="text-xs font-semibold text-erp-500 uppercase tracking-wider mb-1">Agent Plan</h3>
        <p className="text-[10px] text-erp-400">Step-by-step modification plan.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tasks.length === 0 ? (
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <span className="text-xs">No active tasks</span>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className={`flex items-start gap-3 p-3 border rounded-lg shadow-sm transition-all duration-300 ${
                  task.status === 'in_progress'
                    ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100'
                    : task.status === 'failed'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-white border-erp-100'
                }`}
              >
                <div className="pt-0.5">
                  {task.status === 'completed' ? (
                    <div className="bg-green-100 text-green-600 rounded-full p-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  ) : task.status === 'in_progress' ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                  ) : task.status === 'failed' ? (
                    <div className="bg-red-100 text-red-600 rounded-full p-0.5" title="Task Failed">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-erp-200"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div
                    className={`text-sm ${
                      task.status === 'completed'
                        ? 'text-erp-400 line-through'
                        : task.status === 'failed'
                          ? 'text-red-800'
                          : 'text-erp-800 font-medium'
                    }`}
                  >
                    {task.description}
                  </div>
                  <div
                    className={`text-[10px] mt-1 uppercase font-bold tracking-wide flex items-center gap-1 ${
                      task.status === 'in_progress'
                        ? 'text-blue-600'
                        : task.status === 'failed'
                          ? 'text-red-500'
                          : 'text-erp-400'
                    }`}
                  >
                    {task.status.replace('_', ' ')}
                  </div>
                </div>
                <div className="text-xs font-mono text-erp-300">#{index + 1}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskPanel;
