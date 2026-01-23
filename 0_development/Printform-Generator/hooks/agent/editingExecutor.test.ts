import { executeModifyCode } from './editingExecutor';

describe('executeModifyCode', () => {
  it('rejects rewrite that would empty a non-empty file', () => {
    const current = '<div class="printform">x</div>';
    const res = executeModifyCode(current, { operation: 'rewrite', new_code: '' });
    expect(res.success).toBe(false);
    expect(res.output).toContain('Refusing to rewrite');
  });

  it('rejects suspiciously short rewrite content', () => {
    const current = '<div class="printform">x</div>';
    const res = executeModifyCode(current, { operation: 'rewrite', new_code: '<div>hi</div>' });
    expect(res.success).toBe(false);
    expect(res.output).toContain('suspiciously short');
  });

  it('allows rewrite when content is substantial', () => {
    const current = '<div class="printform">x</div>';
    const largeHtml = '<div class="printform">' + 'a'.repeat(200) + '</div>';
    const res = executeModifyCode(current, { operation: 'rewrite', new_code: largeHtml });
    expect(res.success).toBe(true);
    expect(res.updatedContent).toBe(largeHtml);
  });
});
