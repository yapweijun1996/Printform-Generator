import { describe, it, expect } from 'vitest';
import { validateStrictHtmlTables } from './strictHtmlTableValidator';

describe('validateStrictHtmlTables', () => {
  it('flags td outside tr', () => {
    const issues = validateStrictHtmlTables('<table><td>bad</td></table>', { maxIssues: 20 });
    expect(issues.some((i) => i.code === 'CELL_PARENT' && i.level === 'error')).toBe(true);
  });

  it('flags table directly inside table', () => {
    const issues = validateStrictHtmlTables('<table><table></table></table>', { maxIssues: 20 });
    expect(issues.some((i) => i.code === 'TABLE_IN_TABLE' && i.level === 'error')).toBe(true);
  });

  it('warns on empty tr', () => {
    const issues = validateStrictHtmlTables('<table><tr></tr></table>', { maxIssues: 20 });
    expect(issues.some((i) => i.code === 'TR_EMPTY' && i.level === 'warn')).toBe(true);
  });

  it('allows PrintForm.js style template fragments', () => {
    const html = '<template><tr><td>A</td></tr></template><table><tr><td>B</td></tr></table>';
    const issues = validateStrictHtmlTables(html, { maxIssues: 50, allowTableFragmentsInTemplate: true });
    expect(issues.some((i) => i.level === 'error')).toBe(false);
  });
});
