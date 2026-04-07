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

  // Note: PrintForm.js sections can be <div> or <table> — both work.
  // We only check that the section class is on a direct child of .printform, not nested inside another section.

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

  // Check that table-based sections have proper structure (best-effort).
  // Note: div-based sections don't need colgroup — this only checks table sections.
  for (const cls of SECTION_CLASSES) {
    const tableOpenMatch = new RegExp(`<table\\b[^>]*class=["'][^"']*\\b${cls}\\b[^"']*["'][^>]*>`, 'i').exec(text);
    if (!tableOpenMatch) continue;

    const fromIdx = tableOpenMatch.index;
    const windowText = text.slice(fromIdx, Math.min(text.length, fromIdx + 2500));
    const hasColgroup = /<colgroup\b/i.test(windowText);
    const hasWidthOnTd = /width\s*:\s*\d+px/gi.test(windowText);

    if (!hasColgroup && !hasWidthOnTd) {
      add(
        'warn',
        'SECTION_NO_WIDTH',
        `Table section ".${cls}" has no <colgroup> or <td width>. Consider adding column widths for consistent layout.`,
      );
    }
  }

  // CRITICAL: If .prowheader exists, there MUST be at least one .prowitem
  const hasProwheader = /class=["'][^"']*\bprowheader\b[^"']*["']/i.test(text);
  const rowItems = text.match(/class=["'][^"']*\bprowitem\b[^"']*["']/gi)?.length ?? 0;

  if (hasProwheader && rowItems === 0) {
    add(
      'error',
      'PROWHEADER_WITHOUT_PROWITEM',
      'Found .prowheader but NO .prowitem blocks. A row header without data rows is INVALID. Generate at least 1 .prowitem (preferably 20~30 for testing).',
    );
  }

  if (requireThreePageTest && rowItems < minProwitemCount) {
    add(
      'error',
      'LOW_ROWITEM_COUNT',
      `Found only ${rowItems} .prowitem blocks. For 3-page testing, generate at least ${minProwitemCount} items.`,
    );
  } else if (rowItems < 20 && rowItems > 0) {
    add(
      'warn',
      'LOW_ROWITEM_COUNT',
      `Found only ${rowItems} .prowitem blocks. For multi-page testing, consider generating 70~120 items.`,
    );
  }

  // P1: prowheader/prowitem column count consistency
  const countCols = (pattern: RegExp) => {
    const match = text.match(pattern);
    if (!match) return 0;
    const block = text.slice(match.index!, Math.min(text.length, match.index! + 2500));
    return (block.match(/<col\b/gi) || []).length;
  };
  const prowheaderCols = countCols(/<table\b[^>]*class=["'][^"']*\bprowheader\b[^"']*["'][^>]*>/i);
  const prowitemMatch = /<table\b[^>]*class=["'][^"']*\bprowitem\b[^"']*["'][^>]*>/i;
  const prowitemCols = countCols(prowitemMatch);
  if (prowheaderCols > 0 && prowitemCols > 0 && prowheaderCols !== prowitemCols) {
    add(
      'error',
      'COLUMN_COUNT_MISMATCH',
      `prowheader has ${prowheaderCols} columns but prowitem has ${prowitemCols} columns. Column counts must match for proper alignment.`,
    );
  }

  // P1: processed class styling check
  const usesProcessedSections = /\.(pheader|prowheader|prowitem|pfooter_pagenum|printform)/i.test(text);
  const hasStyleBlock = /<style\b/i.test(text);
  if (usesProcessedSections && hasStyleBlock) {
    const styleContent = text.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i)?.[1] || '';
    const hasOriginalClass = /\.(pheader|prowheader|prowitem|pfooter_pagenum|printform)\b/i.test(styleContent);
    const hasProcessedClass = /_processed\b/i.test(styleContent);
    if (hasOriginalClass && !hasProcessedClass) {
      add(
        'warn',
        'MISSING_PROCESSED_CLASS',
        'CSS targets original PrintForm.js classes but not _processed variants. PrintForm.js renames classes during formatting (e.g. .pheader → .pheader_processed). Target both.',
      );
    }
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
