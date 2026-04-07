export interface ToolItem {
  id: string;
  label: string;
  description: string;
  implemented: boolean;
}

export interface ToolCategory {
  category: string;
  items: ToolItem[];
}

export const AVAILABLE_TOOLS: ToolCategory[] = [
  {
    category: 'Core Editing',
    items: [
      {
        id: 'code_replace',
        label: 'Smart Replace',
        description: 'Modify specific code blocks safely.',
        implemented: true,
      },
      {
        id: 'code_rewrite',
        label: 'Full Rewrite',
        description: 'Re-generate entire files (Aggressive).',
        implemented: true,
      },
      {
        id: 'code_insert',
        label: 'Content Insert',
        description: 'Inject rows/columns without rewriting.',
        implemented: true,
      },
      { id: 'diff_check', label: 'Diff Checker', description: 'Preview changes before applying.', implemented: true },
      { id: 'undo_last', label: 'Undo Last', description: 'Revert the last change (per file).', implemented: true },
    ],
  },
  {
    category: 'Data & Grounding',
    items: [
      {
        id: 'web_search',
        label: 'Web Search',
        description: 'Ground answers using Gemini Google Search.',
        implemented: false,
      },
      { id: 'read_file', label: 'Read File', description: 'Return current file context.', implemented: true },
      {
        id: 'read_all_files',
        label: 'Project Scan',
        description: 'Return all in-app project files.',
        implemented: true,
      },
      {
        id: 'grep_search',
        label: 'Grep Search',
        description: 'Search patterns across project files.',
        implemented: true,
      },
      {
        id: 'load_reference_template',
        label: 'Load Reference Template',
        description: 'Load PrintForm.js reference templates from examples.',
        implemented: true,
      },
      {
        id: 'image_analysis',
        label: 'Vision Analysis',
        description: 'Understand uploaded form images.',
        implemented: true,
      },
      {
        id: 'visual_review',
        label: 'Visual Review',
        description: 'Request a fresh high-res preview snapshot for visual diff.',
        implemented: true,
      },
    ],
  },
  {
    category: 'Code Quality',
    items: [
      {
        id: 'print_safe_validator',
        label: 'Print-Safe Validator',
        description: 'Validate PrintForm.js + table rules.',
        implemented: true,
      },
      {
        id: 'html_validation',
        label: 'Strict HTML Validator',
        description: 'Ensure valid table nesting.',
        implemented: true,
      },
      {
        id: 'prettier_fmt',
        label: 'Auto Formatter',
        description: 'Run Prettier after generation.',
        implemented: false,
      },
      {
        id: 'explain_code',
        label: 'Explain Mode',
        description: 'Add comments and reasoning to output.',
        implemented: true,
      },
      {
        id: 'extract_colors',
        label: 'Color Extractor',
        description: 'Identify palette from images.',
        implemented: false,
      },
    ],
  },
  {
    category: 'Utilities',
    items: [
      { id: 'calculator', label: 'Math Engine', description: 'Verify invoice totals/taxes.', implemented: false },
      {
        id: 'currency_convert',
        label: 'Currency Converter',
        description: 'Convert rates via search.',
        implemented: false,
      },
      {
        id: 'translator',
        label: 'Auto Translate',
        description: 'Translate labels to target language.',
        implemented: false,
      },
      { id: 'lorem_ipsum', label: 'Lorem Generator', description: 'Fill tables with dummy data.', implemented: false },
      {
        id: 'generate_docs',
        label: 'Doc Generator',
        description: 'Create documentation for the form.',
        implemented: false,
      },
      { id: 'unit_test', label: 'Test Generator', description: 'Create validation tests.', implemented: false },
    ],
  },
];

// Flattens the nested structure to get a simple array of all IDs
// This makes maintenance cheap: add a tool above, and it's automatically "default on" everywhere.
export const ALL_TOOL_IDS = AVAILABLE_TOOLS.flatMap((category) => category.items.map((tool) => tool.id));

export const IMPLEMENTED_TOOL_IDS = AVAILABLE_TOOLS.flatMap((category) =>
  category.items.filter((tool) => tool.implemented).map((tool) => tool.id),
);

export const PRINTFORM_REFERENCE_TEMPLATES = [
  'index.html',
  'demo001.html',
  'demo002.html',
  'delivery_order_test.html',
  'index001.html',
  'index002.html',
  'index003.html',
  'index004.html',
  'index005.html',
  'index006.html',
  'index007.html',
  'index008.html',
  'index009.html',
  'index010.html',
  'index011.html',
  'index012.html',
  'index013.html',
  'index014.html',
  'index015.html',
  'index016.html',
  'index017.html',
] as const;

export const GEMINI_MODELS = [
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Recommended)' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Fast)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
];

export const DEFAULT_GEMINI_MODEL_ID = GEMINI_MODELS[0]?.id || 'gemini-3-pro-preview';

export const DEFAULT_EMBEDDING_MODEL_ID = 'text-embedding-004';
