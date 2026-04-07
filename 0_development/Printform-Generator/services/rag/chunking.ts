const clip = (s: string, maxChars: number) => {
  const text = String(s || '');
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(0, maxChars));
};

export const chunkText = (text: string, opts?: { maxChars?: number; overlapChars?: number }): string[] => {
  const maxChars = Number.isFinite(opts?.maxChars) ? Math.max(200, Number(opts?.maxChars)) : 900;
  const overlapChars = Number.isFinite(opts?.overlapChars) ? Math.max(0, Number(opts?.overlapChars)) : 120;

  const raw = String(text || '').trim();
  if (!raw) return [];

  const paragraphs = raw
    .split(/\n{2,}/g)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: string[] = [];

  let buf = '';
  for (const p of paragraphs) {
    const next = buf ? `${buf}\n\n${p}` : p;
    if (next.length <= maxChars) {
      buf = next;
      continue;
    }

    if (buf) {
      chunks.push(buf);
      const tail = overlapChars > 0 ? clip(buf.slice(-overlapChars), overlapChars) : '';
      buf = tail ? `${tail}\n\n${p}` : p;
      if (buf.length <= maxChars) continue;
    }

    let remaining = p;
    while (remaining.length > maxChars) {
      const slice = remaining.slice(0, maxChars);
      chunks.push(slice);
      const tail = overlapChars > 0 ? clip(slice.slice(-overlapChars), overlapChars) : '';
      remaining = tail ? `${tail}${remaining.slice(maxChars)}` : remaining.slice(maxChars);
    }
    buf = remaining.trim();
  }

  if (buf) chunks.push(buf);
  return chunks.map((c) => c.trim()).filter(Boolean);
};
