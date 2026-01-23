import { buildPrintformSopRagBlock } from './buildSopContext';
import { retrieveSopInfo } from './retrieveSopInfo';

describe('printform SOP retriever', () => {
  it('should retrieve rowheader repeat rules', () => {
    const r = retrieveSopInfo('把表头设置为每页重复');
    expect(r.combined).toContain('data-repeat-rowheader');
    expect(r.combined).toContain('.prowheader');
  });

  it('should retrieve papersize numeric rule', () => {
    const r = retrieveSopInfo('data-papersize-width="750px" 需要改成纯数字吗？');
    expect(r.combined).toContain('data-papersize-width');
    expect(r.combined).toMatch(/750px|不要写|纯数字/);
  });

  it('should retrieve page number placeholders', () => {
    const r = retrieveSopInfo('页码要怎么写？data-page-number / data-page-total');
    expect(r.combined).toContain('data-page-number');
    expect(r.combined).toContain('data-page-total');
  });

  it('should retrieve docinfo repeat rules', () => {
    const r = retrieveSopInfo('发票抬头/单据信息 pdocinfo 要每页重复');
    expect(r.combined).toContain('.pdocinfo');
    expect(r.combined).toContain('data-repeat-docinfo');
  });

  it('should retrieve footer logo repeat rules', () => {
    const r = retrieveSopInfo('页脚 logo 要每页重复显示');
    expect(r.combined).toContain('.pfooter_logo');
    expect(r.combined).toContain('data-repeat-footer-logo');
  });

  it('should retrieve skeleton template section for invoice template intent', () => {
    const r = retrieveSopInfo('给我一个带页眉、表头、页码的发票模板骨架');
    expect(r.combined).toContain('标准骨架模板');
    expect(r.combined).toContain('class="printform"');
    expect(r.combined).toContain('class="prowitem"');
  });

  it('should retrieve 3-page pagination test strategy (70~120 prowitem)', () => {
    const r = retrieveSopInfo('生成一个模板并确保强制测试 3 页，行项目 70~120 个 prowitem');
    expect(r.combined).toMatch(/强制测试\s*3\s*页|最多\s*3\s*页|70\s*~\s*120/);
    expect(r.combined).toContain('.prowitem');
  });

  it('should build a RAG block with excerpts', () => {
    const block = buildPrintformSopRagBlock('我想要一个带页眉和表头的发票模板');
    expect(block).toContain('[PRINTFORM_JS_SOP_RAG]');
    expect(block).toContain('[SOP EXCERPTS START]');
    expect(block).toContain('[SOP EXCERPTS END]');
  });
});
