import { validatePrintSafe } from './printSafeValidator';

describe('validatePrintSafe (SOP page-frame sections)', () => {
  it('flags non-table pheader when requirePrintformjs=true', () => {
    const html = `
      <div class="printform" data-papersize-width="750" data-papersize-height="1050"
        data-repeat-header="y" data-repeat-rowheader="y" data-repeat-footer-pagenum="y"
        data-insert-footer-spacer-while-format-table="y" data-insert-dummy-row-item-while-format-table="y">
        <div class="pheader">x</div>
      </div>
    `;
    const issues = validatePrintSafe(html, { requirePrintformjs: true, maxIssues: 50 });
    expect(issues.some((i) => i.level === 'error' && i.code === 'MISSING_SECTION')).toBe(true);
    expect(issues.some((i) => i.code === 'SECTION_CONTAINER_DIV')).toBe(true);
  });

  it('accepts table pheader with 15px colgroup when requirePrintformjs=true', () => {
    const html = `
      <div class="printform" data-papersize-width="750" data-papersize-height="1050"
        data-repeat-header="y" data-repeat-rowheader="y" data-repeat-footer-pagenum="y"
        data-insert-footer-spacer-while-format-table="y" data-insert-dummy-row-item-while-format-table="y">
        <table class="pheader" cellpadding="0" cellspacing="0" border="0" style="width:750px;table-layout:fixed;">
          <colgroup>
            <col style="width:15px"><col style="width:auto"><col style="width:15px">
          </colgroup>
          <tr><td></td><td>content</td><td></td></tr>
        </table>
        <table class="prowheader" cellpadding="0" cellspacing="0" border="0" style="width:750px;table-layout:fixed;">
          <colgroup>
            <col style="width:15px"><col style="width:auto"><col style="width:15px">
          </colgroup>
          <tr><td></td><td>content</td><td></td></tr>
        </table>
        <table class="prowitem" cellpadding="0" cellspacing="0" border="0" style="width:750px;table-layout:fixed;">
          <colgroup>
            <col style="width:15px"><col style="width:auto"><col style="width:15px">
          </colgroup>
          <tr><td></td><td>content</td><td></td></tr>
        </table>
        <table class="pfooter_pagenum" cellpadding="0" cellspacing="0" border="0" style="width:750px;table-layout:fixed;">
          <colgroup>
            <col style="width:15px"><col style="width:auto"><col style="width:15px">
          </colgroup>
          <tr><td></td><td><span data-page-number></span>/<span data-page-total></span></td><td></td></tr>
        </table>
      </div>
    `;
    const issues = validatePrintSafe(html, { requirePrintformjs: true, maxIssues: 50 });
    expect(issues.some((i) => i.level === 'error')).toBe(false);
  });
});
