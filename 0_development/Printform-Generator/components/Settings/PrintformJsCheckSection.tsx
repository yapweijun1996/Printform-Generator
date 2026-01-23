import React, { useMemo } from 'react';

type CheckLevel = 'pass' | 'warn';

interface CheckItem {
  label: string;
  level: CheckLevel;
  detail?: string;
}

const parsePxNumber = (value: string) => {
  const n = Number.parseInt(
    String(value || '')
      .trim()
      .replace(/px$/i, ''),
    10,
  );
  return Number.isFinite(n) ? n : undefined;
};

const getBadgeClass = (level: CheckLevel) => {
  if (level === 'pass') return 'bg-green-100 text-green-700 border-green-200';
  return 'bg-amber-100 text-amber-800 border-amber-200';
};

const getBadgeText = (level: CheckLevel) => {
  if (level === 'pass') return 'OK';
  return 'CHECK';
};

interface PrintformJsCheckSectionProps {
  htmlContent: string;
  pageWidth: string;
  pageHeight: string;
  minRowItemsForPaginationTest: number;
}

const PrintformJsCheckSection: React.FC<PrintformJsCheckSectionProps> = ({
  htmlContent,
  pageWidth,
  pageHeight,
  minRowItemsForPaginationTest,
}) => {
  const checks = useMemo(() => {
    const items: CheckItem[] = [];

    const configuredWidth = parsePxNumber(pageWidth);
    const configuredHeight = parsePxNumber(pageHeight);

    const doc = new DOMParser().parseFromString(htmlContent || '', 'text/html');
    const root = doc.querySelector('.printform') as HTMLElement | null;

    items.push({
      label: '存在 .printform 根容器',
      level: root ? 'pass' : 'warn',
      detail: root ? undefined : '找不到 .printform，PrintForm.js 无法分页。',
    });

    const widthAttr = root?.getAttribute('data-papersize-width') || '';
    const heightAttr = root?.getAttribute('data-papersize-height') || '';
    const widthAttrNum = Number.parseInt(widthAttr, 10);
    const heightAttrNum = Number.parseInt(heightAttr, 10);

    const widthOk =
      root && Number.isFinite(widthAttrNum) && configuredWidth !== undefined ? widthAttrNum === configuredWidth : false;
    const heightOk =
      root && Number.isFinite(heightAttrNum) && configuredHeight !== undefined
        ? heightAttrNum === configuredHeight
        : false;

    items.push({
      label: 'data-papersize-width / height 与 Settings 一致',
      level: widthOk && heightOk ? 'pass' : 'warn',
      detail:
        widthOk && heightOk
          ? undefined
          : `建议在 .printform 上设置 data-papersize-width="${configuredWidth ?? '?'}" data-papersize-height="${
              configuredHeight ?? '?'
            }"（纯数字 px）。当前为 width="${widthAttr || '(missing)'}" height="${heightAttr || '(missing)'}"。`,
    });

    const requiredFlags: Array<{ key: string; expected: string; label: string }> = [
      { key: 'data-repeat-header', expected: 'y', label: '重复页眉 .pheader' },
      { key: 'data-repeat-rowheader', expected: 'y', label: '重复表头 .prowheader' },
      { key: 'data-repeat-footer-pagenum', expected: 'y', label: '重复页码 .pfooter_pagenum' },
      { key: 'data-insert-footer-spacer-while-format-table', expected: 'y', label: '页脚 spacer（贴底）' },
      { key: 'data-insert-dummy-row-item-while-format-table', expected: 'y', label: 'dummy row item 填充' },
    ];

    const missingFlags = requiredFlags.filter(
      (f) => String(root?.getAttribute(f.key) || '').toLowerCase() !== f.expected,
    );
    items.push({
      label: '关键 data-* 开关已开启（推荐）',
      level: root && missingFlags.length === 0 ? 'pass' : 'warn',
      detail:
        root && missingFlags.length === 0
          ? undefined
          : `建议开启：${missingFlags.map((f) => `${f.key}="${f.expected}" (${f.label})`).join('、') || '（未检测到 root）'}`,
    });

    const hasHeader = !!doc.querySelector('.pheader');
    const hasRowHeader = !!doc.querySelector('.prowheader');
    const rowItems = Array.from(doc.querySelectorAll('.prowitem'));
    const hasFooterPagenum = !!doc.querySelector('.pfooter_pagenum');
    const hasPageNumberPlaceholder = !!doc.querySelector('.pfooter_pagenum [data-page-number]');
    const hasPageTotalPlaceholder = !!doc.querySelector('.pfooter_pagenum [data-page-total]');

    items.push({ label: '存在 .pheader', level: hasHeader ? 'pass' : 'warn' });
    items.push({ label: '存在 .prowheader', level: hasRowHeader ? 'pass' : 'warn' });
    items.push({
      label: '存在 .pfooter_pagenum + 页码占位符',
      level: hasFooterPagenum && hasPageNumberPlaceholder && hasPageTotalPlaceholder ? 'pass' : 'warn',
      detail:
        hasFooterPagenum && hasPageNumberPlaceholder && hasPageTotalPlaceholder
          ? undefined
          : '建议在 .pfooter_pagenum 内输出：<span data-page-number></span> 与 <span data-page-total></span>。',
    });

    const rowCount = rowItems.length;
    items.push({
      label: '行项目数量（3 页测试）',
      level: rowCount >= minRowItemsForPaginationTest ? 'pass' : 'warn',
      detail: `当前 .prowitem 数量：${rowCount}。建议 >= ${minRowItemsForPaginationTest}（用于稳定触发分页，验证 PrintForm.js 生效）。`,
    });

    const has15pxMarginFrame = Array.from(doc.querySelectorAll('colgroup')).some((cg) => {
      const cols = Array.from(cg.querySelectorAll('col'));
      if (cols.length !== 3) return false;
      const w0 = (cols[0].getAttribute('style') || '').toLowerCase();
      const w2 = (cols[2].getAttribute('style') || '').toLowerCase();
      return w0.includes('width:15px') && w2.includes('width:15px');
    });

    items.push({
      label: '外层 15px / auto / 15px 页边距框架（推荐）',
      level: has15pxMarginFrame ? 'pass' : 'warn',
      detail: has15pxMarginFrame ? undefined : '建议外层使用 3-col colgroup：15px / auto / 15px（作为左右安全边距）。',
    });

    return items;
  }, [htmlContent, minRowItemsForPaginationTest, pageHeight, pageWidth]);

  return (
    <div className="bg-white p-5 rounded-lg border border-erp-200 shadow-sm">
      <h4 className="text-sm font-bold text-erp-800 uppercase tracking-wide mb-2">PrintForm.js 兼容性检查</h4>
      <p className="text-xs text-erp-500 mb-4">
        这些检查用于提示 AI 生成的 HTML 是否符合 PrintForm.js 的分页/重复规则。SOP
        请参考项目文档：docs/PRINTFORM_JS_SOP.md
      </p>

      <div className="space-y-2">
        {checks.map((c, idx) => (
          <div
            key={idx}
            className="flex items-start justify-between gap-3 border border-erp-100 rounded-lg p-3 bg-erp-50/50"
          >
            <div className="min-w-0">
              <div className="text-sm text-erp-800 font-medium">{c.label}</div>
              {c.detail && <div className="text-xs text-erp-500 mt-1 break-words">{c.detail}</div>}
            </div>
            <span className={`flex-none text-[10px] px-2 py-1 rounded border font-bold ${getBadgeClass(c.level)}`}>
              {getBadgeText(c.level)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrintformJsCheckSection;
