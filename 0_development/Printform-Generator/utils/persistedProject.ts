import { ProjectFile, FileHistory } from '../types';
import { idbDel, idbGet, idbSet } from './indexedDb';

export interface PersistedProjectStateV1 {
  version: 1;
  savedAt: number;
  files: ProjectFile[];
  activeFileId: string;
  history: FileHistory[];
}

const KEY = 'project_state_v1';

export const loadProjectState = async (): Promise<PersistedProjectStateV1 | undefined> => {
  const state = await idbGet<PersistedProjectStateV1>(KEY);
  if (!state || state.version !== 1) return undefined;
  if (!Array.isArray(state.files) || state.files.length === 0) return undefined;
  return state;
};

export const saveProjectState = async (
  state: Omit<PersistedProjectStateV1, 'version' | 'savedAt'>,
): Promise<boolean> => {
  return await idbSet(KEY, {
    version: 1,
    savedAt: Date.now(),
    ...state,
  } satisfies PersistedProjectStateV1);
};

export const clearProjectState = async (): Promise<boolean> => {
  return await idbDel(KEY);
};
