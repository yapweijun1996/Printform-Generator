export type RagSourceKind = 'sop' | 'template';

export interface RagDocument {
  id: string;
  kind: RagSourceKind;
  title: string;
  text: string;
}

export interface RagChunk {
  id: string;
  kind: RagSourceKind;
  sourceId: string;
  title: string;
  text: string;
  embedding: number[];
}

export interface RagIndex {
  version: number;
  embeddingModel: string;
  outputDim: number;
  createdAt: number;
  chunks: RagChunk[];
}

export interface RagQueryHit {
  chunk: RagChunk;
  score: number;
}
