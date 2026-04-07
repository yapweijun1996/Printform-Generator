import { describe, expect, it } from 'vitest';
import { chunkText } from './chunking';

describe('chunkText', () => {
  it('returns empty array for empty input', () => {
    expect(chunkText('')).toEqual([]);
  });

  it('chunks long text with overlap', () => {
    const text = Array.from({ length: 50 }, (_, i) => `para ${i} ${'x'.repeat(40)}`).join('\n\n');
    const chunks = chunkText(text, { maxChars: 300, overlapChars: 50 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 300)).toBe(true);
  });
});
