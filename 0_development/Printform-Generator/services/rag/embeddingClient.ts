import { GoogleGenAI } from '@google/genai';

export class GeminiEmbeddingClient {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async embedTexts(params: {
    texts: string[];
    model: string;
    outputDim: number;
    batchSize?: number;
  }): Promise<number[][]> {
    const texts = params.texts.map((t) => String(t || '')).filter((t) => t.trim().length > 0);
    const model = String(params.model || '').trim();
    const outputDim = Number.isFinite(params.outputDim) ? Number(params.outputDim) : 256;
    const batchSize = Number.isFinite(params.batchSize) ? Math.max(1, Number(params.batchSize)) : 16;

    if (!texts.length) return [];
    if (!model) throw new Error('Embedding model is missing.');

    const all: number[][] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const response = await this.ai.models.embedContent({
        model,
        contents: batch,
        config: { outputDimensionality: outputDim },
      });
      const embeddings = response.embeddings || [];
      all.push(...embeddings.map((e) => e.values || []));
    }
    return all;
  }
}
