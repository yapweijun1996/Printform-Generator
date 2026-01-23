import { buildAutoGroundingContext } from './autoGrounding';
import type { ConversationHandlerDependencies } from './conversationTypes';

const makeDeps = (overrides: Partial<ConversationHandlerDependencies> = {}): ConversationHandlerDependencies =>
  ({
    geminiServiceRef: { current: null as any },
    getActiveFile: () =>
      ({
        id: 'f1',
        name: 'invoice-template.html',
        language: 'html',
        content: '',
        updatedAt: Date.now(),
      }) as any,
    getAllFiles: () => [],
    updateFileContent: () => undefined,
    revertToLatestHistory: () => false,
    activeTools: ['load_reference_template', 'print_safe_validator', 'html_validation'],
    pageWidth: '750px',
    pageHeight: '1050px',
    minRowItemsForPaginationTest: 70,
    diffCheckEnabled: false,
    autoApplyDiff: false,
    strictPreviewGate: false,
    requestPreviewSnapshot: () => undefined,
    getPreviewSnapshotVersion: () => 0,
    tasksRef: { current: [] },
    referenceImageRef: { current: undefined },
    previewImageRef: { current: undefined },
    waitForNextPreviewSnapshot: async () => true,
    setTasks: () => undefined,
    setMessages: () => undefined,
    setIsLoading: () => undefined,
    setBotStatus: () => undefined,
    ...overrides,
  }) as any;

describe('buildAutoGroundingContext', () => {
  it('returns an AUTO_GROUNDING block', async () => {
    const deps = makeDeps();
    const txt = await buildAutoGroundingContext({
      userMessage: 'Create an invoice from scratch',
      deps,
      recursionDepth: 0,
      hasReferenceImage: false,
    });
    expect(txt).toContain('[AUTO_GROUNDING]');
    expect(txt).toContain('print_safe_validator:');
    expect(txt).toContain('html_validation:');
  });
});
