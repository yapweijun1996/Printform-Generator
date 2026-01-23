import { getPrintformSopText } from './sopSource';

export interface SopRetrieveOptions {
  maxSections?: number;
  maxTotalChars?: number;
  minScore?: number;
}

interface SopSection {
  heading: string;
  content: string;
  score: number;
}

const DEFAULT_MAX_SECTIONS = 3;
const DEFAULT_MAX_TOTAL_CHARS = 3500;

const splitIntoSections = (md: string): Array<{ heading: string; content: string }> => {
  const text = String(md || '');
  const lines = text.split(/\r?\n/);
  const sections: Array<{ heading: string; content: string }> = [];

  let currentHeading = 'Preamble';
  let buf: string[] = [];

  const flush = () => {
    const content = buf.join('\n').trim();
    if (content) sections.push({ heading: currentHeading, content });
    buf = [];
  };

  for (const line of lines) {
    const m = line.match(/^(#{2,3})\s+(.+?)\s*$/);
    if (m) {
      flush();
      currentHeading = `${m[1]} ${m[2]}`;
      continue;
    }
    buf.push(line);
  }
  flush();
  return sections;
};

const normalize = (s: string) => String(s || '').toLowerCase();

const countOccurrences = (haystack: string, needle: string): number => {
  const h = normalize(haystack);
  const n = normalize(needle).trim();
  if (!n) return 0;
  let count = 0;
  let idx = 0;
  while (true) {
    idx = h.indexOf(n, idx);
    if (idx === -1) break;
    count += 1;
    idx += n.length;
  }
  return count;
};

const extractExplicitTokens = (input: string): string[] => {
  const s = String(input || '');
  const tokens: string[] = [];
  const dataAttrs = s.match(/data-[a-z0-9-]+/gi) || [];
  const classes = s.match(/\.[a-z][a-z0-9_:-]*/gi) || [];
  [...dataAttrs, ...classes].forEach((t) => tokens.push(t));
  return Array.from(new Set(tokens));
};

const inferQueryTerms = (intentQuery: string): string[] => {
  const q = normalize(intentQuery);
  const terms: string[] = [];

  // Common intents (CN + EN) → SOP anchors
  const addIf = (cond: boolean, t: string[]) => {
    if (cond) terms.push(...t);
  };

  const wantsTemplate = /模板|template|skeleton|骨架/.test(q);
  const mentionsDocumentType = /发票|invoice|delivery|packing\s*slip|出货|送货单/.test(q);
  const wantsGenerate = /生成|create|build|new|产出|输出|重写|rewrite/.test(q);
  const wantsPaginationTest =
    /三页|3\s*页|3-page|three\s*page|多页|分页测试|pagination\s*test/.test(q) || /70\s*~\s*120|70-120/.test(q);

  addIf(wantsTemplate || (mentionsDocumentType && /生成|create|build|new/.test(q)), [
    '标准骨架模板',
    '最小可用',
    '统一页边距：外层 3 栏 Table',
    '15px / auto / 15px',
    'colgroup',
    'table-layout:fixed',
    '.printform',
  ]);
  addIf(/三栏|3\s*栏|page\s*frame|页边距|margin|safe\s*margin/.test(q), [
    '外层 3 栏 Table',
    '15px',
    'colgroup',
    'table-layout:fixed',
  ]);
  addIf(/inline\s*style|内联样式|不要\\s*style\\s*block|no\\s*<style>/.test(q), ['INLINE STYLES', 'NO <STYLE>']);

  // Generation strategy: force pagination to up to 3 pages (70~120 .prowitem)
  addIf(wantsGenerate || wantsTemplate || wantsPaginationTest, [
    'Copilot 生成策略',
    '强制测试 3 页',
    '最多 3 页',
    '70~120',
    '.prowitem',
  ]);

  addIf(/页眉|header/.test(q), ['.pheader', 'data-repeat-header', 'data-repeat-header="y"']);
  addIf(/单据|抬头|单据信息|doc\s*info|docinfo|pdocinfo/.test(q), [
    '.pdocinfo',
    '.pdocinfo002',
    '.pdocinfo003',
    '.pdocinfo004',
    '.pdocinfo005',
    'data-repeat-docinfo',
    'data-repeat-docinfo002',
    'data-repeat-docinfo003',
    'data-repeat-docinfo004',
    'data-repeat-docinfo005',
  ]);
  addIf(/表头|行表头|row\s*header|rowheader|prowheader/.test(q), [
    '.prowheader',
    'data-repeat-rowheader',
    'data-repeat-rowheader="y"',
    '必须配对 .prowitem',
    'prowheader 必须有 prowitem',
  ]);
  addIf(/页脚|footer/.test(q), [
    '.pfooter',
    '.pfooter002',
    '.pfooter003',
    '.pfooter004',
    '.pfooter005',
    '.pfooter_logo',
    '.pfooter_pagenum',
    'data-repeat-footer',
    'data-repeat-footer002',
    'data-repeat-footer003',
    'data-repeat-footer004',
    'data-repeat-footer005',
    'data-repeat-footer-logo',
    'data-repeat-footer-pagenum',
  ]);
  addIf(/logo|商标|页脚logo|footer\s*logo/.test(q), ['.pfooter_logo', 'data-repeat-footer-logo']);
  addIf(/页码|page\s*number|page-total|data-page-number|data-page-total/.test(q), [
    'data-page-number',
    'data-page-total',
    '.pfooter_pagenum',
    'data-show-logical-page-number',
    'data-show-physical-page-number',
  ]);
  addIf(/分页|拆页|pagination|formatall|format\(/.test(q), ['pagination', 'PrintForm.formatAll', '拆分成多页']);
  addIf(/纸张|尺寸|宽|高|papersize|page\s*(width|height)/.test(q), [
    'data-papersize-width',
    'data-papersize-height',
    '不要写 `750px`',
  ]);
  addIf(/dummy|空白行|填充|spacer|footer\s*spacer/.test(q), [
    'data-height-of-dummy-row-item',
    'data-insert-footer-spacer-while-format-table',
    'data-insert-footer-spacer-with-dummy-row-item-while-format-table',
    'data-insert-dummy-row-item-while-format-table',
    'data-insert-dummy-row-while-format-table',
  ]);
  addIf(/行项目|item|prowitem/.test(q), ['.prowitem', '一个 item 一个 table', '70~120']);
  addIf(/ptac/.test(q), ['data-repeat-ptac-rowheader', 'data-insert-ptac-dummy-row-items', '.prowitem', '.prowheader']);
  addIf(/paddt/.test(q), [
    'data-repeat-paddt',
    'data-repeat-paddt-rowheader',
    'data-insert-paddt-dummy-row-items',
    'data-repeat-paddt-docinfo',
    'data-repeat-paddt-docinfo002',
    'data-repeat-paddt-docinfo003',
    'data-repeat-paddt-docinfo004',
    'data-repeat-paddt-docinfo005',
  ]);
  addIf(/踩坑|坑|pitfall/.test(q), ['常见踩坑清单', '错误：']);

  terms.push(...extractExplicitTokens(intentQuery));
  return Array.from(new Set(terms)).filter(Boolean);
};

const defaultFallbackTerms = [
  '.printform',
  '标准骨架模板',
  'colgroup',
  'table-layout:fixed',
  '强制测试 3 页',
  '70~120',
  'data-papersize-width',
  'data-repeat-header="y"',
  'data-repeat-rowheader="y"',
  '.pdocinfo',
  '.prowitem',
  '.pfooter_logo',
  '.pfooter_pagenum',
  'data-page-number',
  '常见踩坑清单',
];

const clip = (s: string, max: number) => {
  const text = String(s || '');
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max)) + '\n... (truncated)\n';
};

export const retrieveSopInfo = (intentQuery: string, options: SopRetrieveOptions = {}) => {
  const md = getPrintformSopText();
  const sections = splitIntoSections(md);

  const terms = inferQueryTerms(intentQuery);
  const effectiveTerms = terms.length > 0 ? terms : defaultFallbackTerms;

  const scored: SopSection[] = sections.map((s) => {
    const headingBoost = effectiveTerms.reduce((sum, t) => sum + countOccurrences(s.heading, t) * 3, 0);
    const bodyScore = effectiveTerms.reduce((sum, t) => sum + countOccurrences(s.content, t), 0);
    return { heading: s.heading, content: s.content, score: headingBoost + bodyScore };
  });

  scored.sort((a, b) => b.score - a.score);

  const maxSections = options.maxSections ?? DEFAULT_MAX_SECTIONS;
  const maxTotalChars = options.maxTotalChars ?? DEFAULT_MAX_TOTAL_CHARS;
  const minScore = options.minScore ?? 1;

  const picked: SopSection[] = [];
  let used = 0;
  for (const s of scored) {
    if (picked.length >= maxSections) break;
    if (s.score < minScore) continue;
    const chunk = `\n=== ${s.heading} ===\n${s.content}\n`;
    if (used + chunk.length > maxTotalChars) {
      const remaining = Math.max(0, maxTotalChars - used);
      if (remaining > 200) {
        picked.push({ ...s, content: clip(s.content, remaining - (`\n=== ${s.heading} ===\n`.length + 10)) });
      }
      break;
    }
    picked.push(s);
    used += chunk.length;
  }

  if (picked.length === 0) {
    // fallback to a tiny, always-useful excerpt
    const fallback = scored.find((s) => s.score > 0) || scored[0];
    if (fallback) picked.push({ ...fallback, content: clip(fallback.content, Math.min(1200, maxTotalChars)) });
  }

  const combined = picked
    .map((s) => `=== ${s.heading} ===\n${s.content}`)
    .join('\n\n')
    .trim();

  return {
    queryTerms: effectiveTerms,
    sections: picked.map((s) => ({ heading: s.heading, score: s.score, content: s.content })),
    combined,
  };
};
