type StoredValue = any;

const DB_NAME = 'formgenie';
const DB_VERSION = 1;
const STORE_KV = 'kv';

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB is not available in this environment.'));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_KV)) {
        db.createObjectStore(STORE_KV);
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open indexedDB.'));
  });

const withStore = async <T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_KV, mode);
      const store = tx.objectStore(STORE_KV);
      const req = fn(store);

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('indexedDB request failed.'));
    });
  } finally {
    db.close();
  }
};

export const idbGet = async <T = StoredValue>(key: string): Promise<T | undefined> => {
  try {
    return (await withStore<T | undefined>('readonly', (store) => store.get(key))) as T | undefined;
  } catch {
    return undefined;
  }
};

export const idbSet = async (key: string, value: StoredValue): Promise<boolean> => {
  try {
    await withStore('readwrite', (store) => store.put(value, key));
    return true;
  } catch {
    return false;
  }
};

export const idbDel = async (key: string): Promise<boolean> => {
  try {
    await withStore('readwrite', (store) => store.delete(key));
    return true;
  } catch {
    return false;
  }
};

/**
 * Audit Log 专用函数
 */
import type { AuditLogEntry } from '../types';

const AUDIT_LOG_KEY = 'audit_log_entries';
const MAX_AUDIT_ENTRIES = 500; // 最多保留 500 条记录

export const saveAuditLogEntry = async (entry: AuditLogEntry): Promise<boolean> => {
  try {
    const existing = (await idbGet<AuditLogEntry[]>(AUDIT_LOG_KEY)) || [];
    const updated = [entry, ...existing].slice(0, MAX_AUDIT_ENTRIES); // 保持最新的 500 条
    return await idbSet(AUDIT_LOG_KEY, updated);
  } catch {
    return false;
  }
};

export const getAuditLog = async (): Promise<AuditLogEntry[]> => {
  try {
    return (await idbGet<AuditLogEntry[]>(AUDIT_LOG_KEY)) || [];
  } catch {
    return [];
  }
};

export const clearAuditLog = async (): Promise<boolean> => {
  try {
    return await idbDel(AUDIT_LOG_KEY);
  } catch {
    return false;
  }
};
