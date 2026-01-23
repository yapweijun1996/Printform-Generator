import React, { useEffect, useState } from 'react';
import { AuditLogEntry } from '../../types';
import { getAuditLog, clearAuditLog } from '../../utils/indexedDb';

const AuditLogPanel: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    const data = await getAuditLog();
    setLogs(data);
    setIsLoading(false);
  };

  useEffect(() => {
    const timeout = setTimeout(fetchLogs, 0);
    // Set up an interval to poll for new logs since we don't have a reactive store for IDB yet
    const interval = setInterval(fetchLogs, 5000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  const handleClear = async () => {
    if (confirm('Are you sure you want to clear the audit log?')) {
      await clearAuditLog();
      await fetchLogs();
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-none p-4 border-b border-erp-100 bg-erp-50/50 flex justify-between items-center">
        <div>
          <h3 className="text-xs font-semibold text-erp-500 uppercase tracking-wider mb-1">Audit Log</h3>
          <p className="text-[10px] text-erp-400">Track all AI actions.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchLogs}
            className="p-1.5 text-erp-400 hover:text-erp-600 rounded hover:bg-erp-100 transition-colors"
            title="Refresh"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 text-erp-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
            title="Clear Log"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-0">
        {isLoading && logs.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-erp-300 border-t-transparent"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-erp-300">
            <span className="text-xs">No audit logs found</span>
          </div>
        ) : (
          <div className="divide-y divide-erp-100">
            {logs.map((log) => (
              <div key={log.id} className="p-3 hover:bg-erp-50/50 transition-colors group">
                <div className="flex items-start justify-between mb-1">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {log.action}
                  </span>
                  <span className="text-[10px] text-erp-400 font-mono">{formatTime(log.timestamp)}</span>
                </div>

                <div className="text-sm text-erp-800 font-medium mb-1">{log.description}</div>

                {log.details && (
                  <details className="mt-1">
                    <summary className="text-[10px] text-erp-400 cursor-pointer hover:text-erp-600 select-none flex items-center gap-1">
                      <span>Show details</span>
                    </summary>
                    <pre className="mt-2 p-2 bg-erp-50 rounded text-[10px] text-erp-600 font-mono overflow-x-auto whitespace-pre-wrap border border-erp-100">
                      {log.details}
                      {log.args && (
                        <>
                          {'\n\n--- Arguments ---\n'}
                          {JSON.stringify(log.args, null, 2)}
                        </>
                      )}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogPanel;
