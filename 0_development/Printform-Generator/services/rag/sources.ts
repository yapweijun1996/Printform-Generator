import { PRINTFORM_REFERENCE_TEMPLATES } from '../../constants';
import { getPrintformSopText } from '../printformSop';
import type { RagDocument } from './types';

const clip = (s: string, max: number) => {
  const text = String(s || '');
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max)) + '\n... (truncated)\n';
};

const extractTablesByClass = (html: string, className: string, maxMatches: number) => {
  const h = String(html || '');
  const re = new RegExp(`<table\\b[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>[\\s\\S]*?<\\/table>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(h)) && out.length < maxMatches) {
    out.push(m[0]);
  }
  return out;
};

const extractPrintformRootOpenTag = (html: string) => {
  const h = String(html || '');
  const m = h.match(/<div\b[^>]*class=["'][^"']*\bprintform\b[^"']*["'][^>]*>/i);
  return m?.[0] || '';
};

const loadTemplate = async (name: string, maxChars: number) => {
  const response = await fetch(`/printform-js/${name}`);
  if (!response.ok) throw new Error(`Failed to load template "${name}": ${response.status} ${response.statusText}`);
  const text = await response.text();
  return clip(text, maxChars);
};

export const loadRagDocuments = async (opts?: { maxTemplateChars?: number }): Promise<RagDocument[]> => {
  const maxTemplateChars = Number.isFinite(opts?.maxTemplateChars) ? Number(opts?.maxTemplateChars) : 35000;
  const docs: RagDocument[] = [];

  const sop = getPrintformSopText();
  if (sop && sop.trim()) {
    docs.push({
      id: 'sop:printform',
      kind: 'sop',
      title: 'PrintForm.js SOP (Project)',
      text: sop,
    });
  }

  for (const name of PRINTFORM_REFERENCE_TEMPLATES) {
    const html = await loadTemplate(name, maxTemplateChars);
    const rootTag = extractPrintformRootOpenTag(html);
    if (rootTag) {
      docs.push({
        id: `template:${name}#printform-root`,
        kind: 'template',
        title: `${name} (printform root)`,
        text: rootTag,
      });
    }

    const sections: Array<{ cls: string; max: number }> = [
      { cls: 'pheader', max: 1 },
      { cls: 'pdocinfo', max: 1 },
      { cls: 'prowheader', max: 1 },
      { cls: 'prowitem', max: 2 },
      { cls: 'pfooter_pagenum', max: 1 },
    ];

    for (const s of sections) {
      const matches = extractTablesByClass(html, s.cls, s.max);
      matches.forEach((t, idx) => {
        docs.push({
          id: `template:${name}#${s.cls}[${idx}]`,
          kind: 'template',
          title: `${name} (.${s.cls})`,
          text: clip(t, 9000),
        });
      });
    }
  }

  return docs;
};
