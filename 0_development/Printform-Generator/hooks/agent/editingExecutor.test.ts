import { modifyCodeTool } from './tools/EditingTools';
import type { ToolContext } from './Tool';
import type { MutableRefObject } from 'react';
import type { AgentTask } from '../../types';

const makeContext = (content: string): ToolContext => ({
  getActiveFile: () => ({ id: '1', name: 'test.html', language: 'html', content, updatedAt: 0 }),
  getAllFiles: () => [],
  updateFileContent: () => {},
  revertToLatestHistory: () => false,
  tasksRef: { current: [] } as MutableRefObject<AgentTask[]>,
  setTasks: () => {},
});

describe('modifyCodeTool', () => {
  it('rejects rewrite that would empty a non-empty file', async () => {
    const ctx = makeContext('<div class="printform">x</div>');
    const res = await modifyCodeTool.call({ operation: 'rewrite', new_code: '' }, ctx);
    expect(res.success).toBe(false);
    expect(res.output).toContain('Refusing to rewrite');
  });

  it('rejects suspiciously short rewrite content', async () => {
    const ctx = makeContext('<div class="printform">x</div>');
    const res = await modifyCodeTool.call({ operation: 'rewrite', new_code: '<div>hi</div>' }, ctx);
    expect(res.success).toBe(false);
    expect(res.output).toContain('suspiciously short');
  });

  it('allows rewrite when content is substantial', async () => {
    const ctx = makeContext('<div class="printform">x</div>');
    const largeHtml = '<div class="printform">' + 'a'.repeat(200) + '</div>';
    const res = await modifyCodeTool.call({ operation: 'rewrite', new_code: largeHtml }, ctx);
    expect(res.success).toBe(true);
    expect(res.updatedContent).toBe(largeHtml);
  });

  it('is not concurrency safe', () => {
    expect(modifyCodeTool.isConcurrencySafe).toBe(false);
  });

  it('is destructive', () => {
    expect(modifyCodeTool.isDestructive).toBe(true);
  });
});
