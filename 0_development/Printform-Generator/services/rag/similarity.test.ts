import { describe, expect, it } from 'vitest';
import { cosineSimilarity } from './similarity';

describe('cosineSimilarity', () => {
  it('is 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6);
  });

  it('is 0 when one vector is empty', () => {
    expect(cosineSimilarity([], [1, 2, 3])).toBe(0);
  });
});
