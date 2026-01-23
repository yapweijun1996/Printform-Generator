import type { AuditLogEntry } from '../types';
import { saveAuditLogEntry } from './indexedDb';

export const logToolAudit = (entry: AuditLogEntry) => {
  saveAuditLogEntry(entry).catch(() => {
    /* ignore */
  });
};

export const logToolResult = (params: {
  action: string;
  description: string;
  status: 'success' | 'error';
  details: string;
  args?: any;
}) => {
  const { action, description, status, details, args } = params;
  logToolAudit({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    timestamp: Date.now(),
    action,
    description,
    status,
    details,
    args,
  });
};
