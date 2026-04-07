import { DEFAULT_EMBEDDING_MODEL_ID } from '../../constants';
import { chunkText } from './chunking';
import { GeminiEmbeddingClient } from './embeddingClient';
import { loadRagIndex, saveRagIndex } from './store';
import { cosineSimilarity } from './similarity';
import { loadRagDocuments } from './sources';
import type { RagChunk, RagIndex, RagQueryHit } from './types';

const clip = (s: string, max: number) => {
  const text = String(s || '');
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max)) + '\n... (truncated)\n';
};

export class SemanticRag {
  private apiKey: string;
  private embeddingModel: string;
  private outputDim: number;
  private indexPromise: Promise<RagIndex> | null = null;

  constructor(params: { apiKey: string; embeddingModel?: string; outputDim?: number }) {
    this.apiKey = params.apiKey;
    this.embeddingModel = params.embeddingModel || DEFAULT_EMBEDDING_MODEL_ID;
    this.outputDim = Number.isFinite(params.outputDim) ? Number(params.outputDim) : 256;
  }

  private async buildIndex(): Promise<RagIndex> {
    const cached = await loadRagIndex(this.embeddingModel, this.outputDim);
    if (cached && Array.isArray(cached.chunks) && cached.chunks.length > 0) return cached;

    const docs = await loadRagDocuments();
    const rawChunks: Array<Omit<RagChunk, 'embedding'>> = [];
    for (const d of docs) {
      const pieces = chunkText(d.text, { maxChars: 900, overlapChars: 120 });
      pieces.forEach((p, idx) => {
        rawChunks.push({
          id: `${d.id}::chunk-${idx}`,
          kind: d.kind,
          sourceId: d.id,
          title: d.title,
          text: p,
        });
      });
    }

    const embedder = new GeminiEmbeddingClient(this.apiKey);
    const vectors = await embedder.embedTexts({
      texts: rawChunks.map((c) => c.text),
      model: this.embeddingModel,
      outputDim: this.outputDim,
      batchSize: 12,
    });

    const chunks: RagChunk[] = rawChunks.map((c, i) => ({
      ...c,
      embedding: vectors[i] || [],
    }));

    const index: RagIndex = {
      version: 1,
      embeddingModel: this.embeddingModel,
      outputDim: this.outputDim,
      createdAt: Date.now(),
      chunks,
    };
    await saveRagIndex(index);
    return index;
  }

  async ensureReady(): Promise<RagIndex> {
    if (!this.apiKey) throw new Error('Missing API key.');
    if (!this.indexPromise) this.indexPromise = this.buildIndex();
    return await this.indexPromise;
  }

  async query(params: { query: string; topK: number }): Promise<RagQueryHit[]> {
    const q = String(params.query || '').trim();
    if (!q) return [];
    const topK = Number.isFinite(params.topK) ? Math.max(1, Math.min(8, Number(params.topK))) : 4;

    const index = await this.ensureReady();
    const embedder = new GeminiEmbeddingClient(this.apiKey);
    const qVec = (
      await embedder.embedTexts({
        texts: [q],
        model: this.embeddingModel,
        outputDim: this.outputDim,
        batchSize: 1,
      })
    )[0];
    if (!qVec || qVec.length === 0) return [];

    const scored = index.chunks
      .map((chunk) => ({ chunk, score: cosineSimilarity(qVec, chunk.embedding) }))
      .filter((x) => Number.isFinite(x.score) && x.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    return scored;
  }

  async buildRagBlock(params: { query: string; topK: number; maxChars?: number }): Promise<string> {
    try {
      const hits = await this.query({ query: params.query, topK: params.topK });
      if (!hits.length) return '';
      const maxChars = Number.isFinite(params.maxChars) ? Math.max(200, Number(params.maxChars)) : 2200;

      const lines: string[] = [];
      lines.push('[SEMANTIC_RAG]');
      hits.forEach((h, idx) => {
        lines.push(`${idx + 1}. score=${h.score.toFixed(3)} source="${h.chunk.title}"`);
        lines.push(clip(h.chunk.text, 700));
      });
      lines.push('Instruction: Use these snippets as grounding. Prefer following SOP rules over free-form HTML.');
      lines.push('[/SEMANTIC_RAG]');

      return clip(lines.join('\n'), maxChars).trim();
    } catch (e: any) {
      return `[SEMANTIC_RAG]\nError: ${e?.message || 'Unknown error'}\n[/SEMANTIC_RAG]`;
    }
  }
}
