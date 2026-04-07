import type { RagIndex } from './types';
import { idbGet, idbSet } from '../../utils/indexedDb';

const keyFor = (embeddingModel: string, outputDim: number) =>
  `semantic_rag_index_v1:${String(embeddingModel)}:${String(outputDim)}`;

export const loadRagIndex = async (embeddingModel: string, outputDim: number): Promise<RagIndex | undefined> => {
  const key = keyFor(embeddingModel, outputDim);
  return await idbGet<RagIndex>(key);
};

export const saveRagIndex = async (index: RagIndex): Promise<boolean> => {
  const key = keyFor(index.embeddingModel, index.outputDim);
  return await idbSet(key, index);
};
