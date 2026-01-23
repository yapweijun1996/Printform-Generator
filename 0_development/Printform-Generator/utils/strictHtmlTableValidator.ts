export type StrictHtmlIssueLevel = 'error' | 'warn';

export interface StrictHtmlIssue {
  level: StrictHtmlIssueLevel;
  code: string;
  message: string;
  line?: number;
  col?: number;
}

export interface StrictHtmlValidatorConfig {
  maxIssues?: number;
  // HTML allows <tr> directly under <table> (implicit <tbody>). Keep this permissive by default.
  allowTrDirectlyUnderTable?: boolean;
  // Treat <template> contents as fragment roots (common in PrintForm.js examples).
  allowTableFragmentsInTemplate?: boolean;
}

type StackEntry =
  | {
      kind: 'tag';
      name: string;
      line: number;
      col: number;
      trHasCell?: boolean;
      tableChildPhase?: 'start' | 'caption_done' | 'colgroup_done' | 'body_started';
    }
  | { kind: 'other' };

const TABLE_TAGS = new Set([
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
  'caption',
  'colgroup',
  'col',
  'template',
]);
const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const isCloseTag = (raw: string) => raw.startsWith('</');
const getTagName = (raw: string) => {
  const m = raw.match(/^<\/?\s*([a-zA-Z0-9-]+)/);
  return (m?.[1] || '').toLowerCase();
};
const isSelfClosing = (raw: string, name: string) => /\/>\s*$/.test(raw) || VOID_TAGS.has(name);

const parentTagName = (stack: StackEntry[]) => {
  for (let i = stack.length - 1; i >= 0; i--) {
    const e = stack[i];
    if (e.kind === 'tag') return e.name;
  }
  return '';
};

const nearestOpenTagIndex = (stack: StackEntry[], name: string) => {
  for (let i = stack.length - 1; i >= 0; i--) {
    const e = stack[i];
    if (e.kind === 'tag' && e.name === name) return i;
  }
  return -1;
};

export const validateStrictHtmlTables = (html: string, config: StrictHtmlValidatorConfig = {}): StrictHtmlIssue[] => {
  const maxIssues = Number.isFinite(config.maxIssues) ? Math.max(1, Number(config.maxIssues)) : 80;
  const allowTrDirectlyUnderTable = config.allowTrDirectlyUnderTable ?? true;
  const allowTableFragmentsInTemplate = config.allowTableFragmentsInTemplate ?? true;

  const issues: StrictHtmlIssue[] = [];
  const add = (level: StrictHtmlIssueLevel, code: string, message: string, line?: number, col?: number) => {
    if (issues.length >= maxIssues) return;
    issues.push({ level, code, message, line, col });
  };

  const text = String(html ?? '');
  if (!text.trim()) {
    add('error', 'EMPTY', 'HTML is empty.');
    return issues;
  }

  // Best-effort tokenizer over tags (we only need table-related nesting signals).
  const tagRe = /<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>/g;
  const stack: StackEntry[] = [];

  let line = 1;
  let col = 1;
  let lastIdx = 0;
  let inScript = 0;
  let inStyle = 0;
  let inTemplate = 0;

  const advancePos = (from: number, to: number) => {
    if (to <= from) return;
    const slice = text.slice(from, to);
    const nl = slice.match(/\n/g)?.length ?? 0;
    if (nl === 0) {
      col += slice.length;
      return;
    }
    line += nl;
    col = slice.length - (slice.lastIndexOf('\n') + 1) + 1;
  };

  const noteTableChild = (childName: string) => {
    for (let i = stack.length - 1; i >= 0; i--) {
      const e = stack[i];
      if (e.kind !== 'tag') continue;
      if (e.name !== 'table') continue;
      const phase = e.tableChildPhase ?? 'start';
      if (childName === 'caption') {
        if (phase !== 'start')
          add('warn', 'TABLE_CAPTION_ORDER', '<caption> should be the first child of <table>.', line, col);
        e.tableChildPhase = 'caption_done';
        return;
      }
      if (childName === 'colgroup') {
        if (phase === 'body_started')
          add('warn', 'TABLE_COLGROUP_ORDER', '<colgroup> should appear before rows/sections in <table>.', line, col);
        e.tableChildPhase = phase === 'start' ? 'colgroup_done' : phase;
        return;
      }
      if (childName === 'thead' || childName === 'tbody' || childName === 'tfoot' || childName === 'tr') {
        e.tableChildPhase = 'body_started';
        return;
      }
      return;
    }
  };

  const validateOpen = (name: string) => {
    const parent = parentTagName(stack);
    const inTemplateFragment = allowTableFragmentsInTemplate && inTemplate > 0 && parent === 'template';

    if (name === 'table') {
      if (parent === 'table')
        add(
          'error',
          'TABLE_IN_TABLE',
          '<table> cannot be a direct child of <table>. Nest it inside <td>/<th>.',
          line,
          col,
        );
      if (parent === 'tr')
        add('error', 'TABLE_IN_TR', '<table> cannot be a direct child of <tr>. Nest it inside <td>/<th>.', line, col);
      if (parent === 'thead' || parent === 'tbody' || parent === 'tfoot')
        add('error', 'TABLE_IN_TSECTION', '<table> cannot be a direct child of <thead>/<tbody>/<tfoot>.', line, col);
      if (parent === 'colgroup')
        add('error', 'TABLE_IN_COLGROUP', '<table> cannot be a direct child of <colgroup>.', line, col);
      return;
    }

    if (name === 'caption' || name === 'colgroup' || name === 'thead' || name === 'tbody' || name === 'tfoot') {
      if (parent !== 'table' && !inTemplateFragment)
        add('error', 'TABLE_CHILD_PARENT', `<${name}> must be a direct child of <table>.`, line, col);
      if (parent === 'table') noteTableChild(name);
      return;
    }

    if (name === 'col') {
      if (parent !== 'colgroup' && !inTemplateFragment)
        add('error', 'COL_PARENT', '<col> must be a child of <colgroup>.', line, col);
      return;
    }

    if (name === 'tr') {
      const okParent =
        parent === 'thead' ||
        parent === 'tbody' ||
        parent === 'tfoot' ||
        (allowTrDirectlyUnderTable && parent === 'table') ||
        inTemplateFragment;
      if (!okParent)
        add(
          'error',
          'TR_PARENT',
          '<tr> must be inside <thead>/<tbody>/<tfoot> (or directly under <table>).',
          line,
          col,
        );
      if (parent === 'table') noteTableChild('tr');
      return;
    }

    if (name === 'td' || name === 'th') {
      if (parent !== 'tr' && !inTemplateFragment)
        add('error', 'CELL_PARENT', `<${name}> must be a direct child of <tr>.`, line, col);
      // Mark the nearest open <tr> as having at least one cell.
      for (let i = stack.length - 1; i >= 0; i--) {
        const e = stack[i];
        if (e.kind === 'tag' && e.name === 'tr') {
          e.trHasCell = true;
          break;
        }
      }
      return;
    }
  };

  const validateClose = (name: string) => {
    const idx = nearestOpenTagIndex(stack, name);
    if (idx < 0) {
      if (TABLE_TAGS.has(name)) add('warn', 'UNMATCHED_CLOSE', `Unmatched closing tag: </${name}>.`, line, col);
      return;
    }

    // Pop until the matching tag (best-effort recovery).
    for (let i = stack.length - 1; i >= idx; i--) {
      const e = stack[i];
      if (e.kind === 'tag' && e.name === 'tr') {
        if (!e.trHasCell)
          add(
            'warn',
            'TR_EMPTY',
            '<tr> has no <td>/<th> cells (invalid HTML, may render inconsistently).',
            e.line,
            e.col,
          );
      }
    }
    stack.length = idx;
  };

  const isScriptOpen = (raw: string, name: string) => !isCloseTag(raw) && name === 'script';
  const isStyleOpen = (raw: string, name: string) => !isCloseTag(raw) && name === 'style';
  const isScriptClose = (raw: string, name: string) => isCloseTag(raw) && name === 'script';
  const isStyleClose = (raw: string, name: string) => isCloseTag(raw) && name === 'style';

  for (const match of text.matchAll(tagRe)) {
    const raw = match[0];
    const idx = match.index ?? 0;
    advancePos(lastIdx, idx);
    lastIdx = idx + raw.length;

    if (raw.startsWith('<!--')) continue;
    const name = getTagName(raw);
    if (!name) continue;

    // Skip validation inside <script>/<style> blocks; keep simple balance tracking.
    if (isScriptOpen(raw, name)) inScript++;
    if (isStyleOpen(raw, name)) inStyle++;
    if (isScriptClose(raw, name)) inScript = Math.max(0, inScript - 1);
    if (isStyleClose(raw, name)) inStyle = Math.max(0, inStyle - 1);
    if (inScript > 0 || inStyle > 0) continue;

    if (isCloseTag(raw)) {
      if (name === 'template') inTemplate = Math.max(0, inTemplate - 1);
      validateClose(name);
      continue;
    }

    validateOpen(name);

    const selfClosing = isSelfClosing(raw, name);
    if (!selfClosing) {
      const entry: StackEntry = { kind: 'tag', name, line, col };
      if (name === 'table') entry.tableChildPhase = 'start';
      stack.push(entry);
      if (name === 'template') inTemplate++;
    }
  }

  return issues;
};
