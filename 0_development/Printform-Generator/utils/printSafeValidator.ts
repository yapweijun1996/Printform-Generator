export type PrintSafeIssueLevel = 'error' | 'warn';

export interface PrintSafeIssue {
  level: PrintSafeIssueLevel;
  code: string;
  message: string;
}

export interface PrintSafeValidatorConfig {
  pageWidth?: string;
  pageHeight?: string;
  maxIssues?: number;
  requirePrintformjs?: boolean;
  requireThreePageTest?: boolean;
  minProwitemCount?: number;
}

const REQUIRED_DATA_ATTRS = [
  'data-papersize-width',
  'data-papersize-height',
  'data-repeat-header',
  'data-repeat-rowheader',
  'data-repeat-footer-pagenum',
  'data-insert-footer-spacer-while-format-table',
  'data-insert-dummy-row-item-while-format-table',
];

const REQUIRED_SECTIONS = ['pheader', 'prowheader', 'pfooter_pagenum'];
const SECTION_CLASSES = ['pheader', 'pdocinfo', 'pdocinfo002', 'prowheader', 'prowitem', 'pfooter_pagenum'];

const hasAttr = (html: string, attr: string) => new RegExp(`${attr}\\s*=\\s*["'][^"']*["']`, 'i').test(html);

export const validatePrintSafe = (html: string, config: PrintSafeValidatorConfig = {}): PrintSafeIssue[] => {
  const maxIssues = config.maxIssues ?? 50;
  const requirePrintformjs = config.requirePrintformjs ?? false;
  const requireThreePageTest = config.requireThreePageTest ?? false;
  const minProwitemCount = config.minProwitemCount ?? 70;
  const issues: PrintSafeIssue[] = [];
  const add = (level: PrintSafeIssueLevel, code: string, message: string) => {
    if (issues.length >= maxIssues) return;
    issues.push({ level, code, message });
  };

  const text = String(html || '');
  if (!text.trim()) {
    add('error', 'EMPTY', 'HTML is empty.');
    return issues;
  }

  const hasPrintformRoot = /<div\b[^>]*class=["'][^"']*\bprintform\b[^"']*["'][^>]*>/i.test(text);
  if (!hasPrintformRoot) add('error', 'NO_PRINTFORM_ROOT', 'Missing root <div class="printform" ...>.');

  for (const attr of REQUIRED_DATA_ATTRS) {
    if (!hasAttr(text, attr)) add('error', 'MISSING_DATA_ATTR', `Missing required attribute: ${attr}.`);
  }

  const papersizeW = text.match(/data-papersize-width\s*=\s*["']([^"']+)["']/i)?.[1];
  const papersizeH = text.match(/data-papersize-height\s*=\s*["']([^"']+)["']/i)?.[1];
  if (papersizeW && /px/i.test(papersizeW))
    add('warn', 'PAPERSIZE_UNIT', 'data-papersize-width should be numeric (no "px").');
  if (papersizeH && /px/i.test(papersizeH))
    add('warn', 'PAPERSIZE_UNIT', 'data-papersize-height should be numeric (no "px").');
  if (papersizeW && !/^\d+(\.\d+)?$/.test(papersizeW.trim()))
    add('warn', 'PAPERSIZE_FORMAT', 'data-papersize-width should be a number.');
  if (papersizeH && !/^\d+(\.\d+)?$/.test(papersizeH.trim()))
    add('warn', 'PAPERSIZE_FORMAT', 'data-papersize-height should be a number.');

  if (/<script\b/i.test(text)) add('error', 'SCRIPT_TAG', 'Contains <script> tags; scripts are not print-safe.');
  if (/<style\b/i.test(text))
    add('warn', 'STYLE_TAG', 'Contains <style> tags; inline styles are preferred for ERP print safety.');
  if (/\son\w+\s*=\s*["']/i.test(text))
    add('error', 'INLINE_EVENTS', 'Contains inline event handlers (onClick/onload/...).');
  if (/javascript:/i.test(text)) add('error', 'JS_URL', 'Contains javascript: URLs.');

  if (!/<table\b/i.test(text)) add('error', 'NO_TABLE', 'No <table> found. ERP print forms must use table layout.');
  if (!/<colgroup\b/i.test(text))
    add('error', 'NO_COLGROUP', 'No <colgroup> found. Column widths must be defined via <colgroup>.');

  const extraDivs = text.match(/<div\b/gi)?.length ?? 0;
  if (extraDivs > 1)
    add('warn', 'EXTRA_DIVS', 'Found multiple <div> tags. Only the root <div class="printform"> is recommended.');

  // Hard rule: Do not use <div> as containers for PrintForm.js section blocks.
  // These sections should be deterministic table-based structures for stable pagination/repeat detection.
  for (const cls of SECTION_CLASSES) {
    const isWrappedByDiv = new RegExp(`<div\\b[^>]*class=["'][^"']*\\b${cls}\\b[^"']*["']`, 'i').test(text);
    if (isWrappedByDiv) {
      add(
        requirePrintformjs ? 'error' : 'warn',
        'SECTION_CONTAINER_DIV',
        `Section ".${cls}" must NOT be a <div>. Use <table>/<tr>/<td> containers for deterministic PrintForm.js layout.`,
      );
    }
  }

  if (/<td\b[^>]*\swidth\s*=\s*["']?\d+/i.test(text))
    add('warn', 'TD_WIDTH_ATTR', 'Found <td width="...">. Do not set width on <td>; use <colgroup> instead.');
  if (/<td\b[^>]*style=["'][^"']*\bwidth\s*:/i.test(text))
    add('warn', 'TD_WIDTH_STYLE', 'Found <td style="...width:...">. Do not set width on <td>; use <colgroup> instead.');

  const tableTags = text.match(/<table\b/gi)?.length ?? 0;
  if (tableTags > 0) {
    const missingLegacyAttrs = (
      text.match(/<table\b(?![^>]*cellpadding=)(?![^>]*cellspacing=)(?![^>]*border=)[^>]*>/gi) || []
    ).length;
    if (missingLegacyAttrs > 0)
      add(
        'warn',
        'TABLE_ATTRS',
        `Some <table> tags may be missing legacy attrs (cellpadding/cellspacing/border). Count (approx): ${missingLegacyAttrs}.`,
      );

    const missingFixedLayout = (text.match(/<table\b(?![^>]*table-layout\s*:\s*fixed)[^>]*>/gi) || []).length;
    if (missingFixedLayout > 0)
      add(
        'warn',
        'TABLE_LAYOUT',
        `Some <table> tags may be missing style="...table-layout:fixed...". Count (approx): ${missingFixedLayout}.`,
      );
  }

  for (const cls of REQUIRED_SECTIONS) {
    const hasAny = new RegExp(`class=["'][^"']*\\b${cls}\\b`, 'i').test(text);
    const hasTable = new RegExp(`<table\\b[^>]*class=["'][^"']*\\b${cls}\\b[^"']*["']`, 'i').test(text);
    const ok = requirePrintformjs ? hasTable : hasAny;
    if (!ok) {
      add(
        requirePrintformjs ? 'error' : 'warn',
        'MISSING_SECTION',
        requirePrintformjs
          ? `Missing required section table: <table class="${cls}" ...> (SOP: section-as-page-frame table).`
          : `Missing recommended PrintForm.js section: .${cls}`,
      );
    }
  }


  // SOP: section-as-page-frame table (15px / auto / 15px). Best-effort regex validation.
  // CRITICAL: Every section MUST be a page-frame table, not just when requirePrintformjs is true.
  for (const cls of SECTION_CLASSES) {
    const tableOpenMatch = new RegExp(`<table\\b[^>]*class=["'][^"']*\\b${cls}\\b[^"']*["'][^>]*>`, 'i').exec(text);
    if (!tableOpenMatch) continue;

    const fromIdx = tableOpenMatch.index;
    const windowText = text.slice(fromIdx, Math.min(text.length, fromIdx + 2500));
    const hasColgroup = /<colgroup\b/i.test(windowText);
    const width15Count = (windowText.match(/width\s*:\s*15px/gi) || []).length;

    // Check for page-frame structure
    if (!hasColgroup) {
      add(
        'error',
        'SECTION_NO_COLGROUP',
        `Section ".${cls}" MUST have a <colgroup>. Each section must be a 3-col page-frame table (15px/auto/15px).`,
      );
    } else if (width15Count < 2) {
      add(
        'error',
        'SECTION_PAGE_FRAME',
        `Section ".${cls}" MUST be a 3-col page-frame table with <colgroup> widths 15px/auto/15px. Found ${width15Count} 15px columns, need 2. The section class should be on the OUTER table, not on a nested content table.`,
      );
    }
  }


  const rowItems = text.match(/class=["'][^"']*\bprowitem\b[^"']*["']/gi)?.length ?? 0;
  if (requireThreePageTest && rowItems < minProwitemCount) {
    add(
      'error',
      'LOW_ROWITEM_COUNT',
      `Found only ${rowItems} .prowitem blocks. For 3-page testing, generate at least ${minProwitemCount} items.`,
    );
  } else if (rowItems < 20) {
    add(
      'warn',
      'LOW_ROWITEM_COUNT',
      `Found only ${rowItems} .prowitem blocks. For multi-page testing, consider generating 70~120 items.`,
    );
  }

  if (config.pageWidth) {
    const rootStyleWidthOk = new RegExp(
      `class=["'][^"']*\\bprintform\\b[^"']*["'][^>]*style=["'][^"']*width\\s*:\\s*${escapeRegExp(config.pageWidth)}`,
      'i',
    ).test(text);
    if (!rootStyleWidthOk) add('warn', 'ROOT_WIDTH', `Root .printform style should include width:${config.pageWidth}.`);
  }
  if (config.pageHeight) {
    const rootStyleHeightOk = new RegExp(
      `class=["'][^"']*\\bprintform\\b[^"']*["'][^>]*style=["'][^"']*min-height\\s*:\\s*${escapeRegExp(config.pageHeight)}`,
      'i',
    ).test(text);
    if (!rootStyleHeightOk)
      add('warn', 'ROOT_HEIGHT', `Root .printform style should include min-height:${config.pageHeight}.`);
  }

  return issues;
};

const escapeRegExp = (s: string) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
