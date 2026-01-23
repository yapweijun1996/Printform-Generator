
export const AVAILABLE_TOOLS = [
  {
    category: "Core Editing",
    items: [
      { id: 'code_replace', label: 'Smart Replace', description: 'Modify specific code blocks safely.' },
      { id: 'code_rewrite', label: 'Full Rewrite', description: 'Re-generate entire files (Aggressive).' },
      { id: 'code_insert', label: 'Content Insert', description: 'Inject rows/columns without rewriting.' },
      { id: 'undo_last', label: 'Undo Capability', description: 'Allow agent to revert bad edits.' },
    ]
  },
  {
    category: "Data & Grounding",
    items: [
      { id: 'web_search', label: 'Web Search', description: 'Access Google Search for real-time info.' },
      { id: 'read_file', label: 'Read File', description: 'Analyze current file context.' },
      { id: 'read_all_files', label: 'Project Scan', description: 'Read all files in project.' },
      { id: 'grep_search', label: 'Grep Search', description: 'Regex pattern matching.' },
      { id: 'image_analysis', label: 'Vision Analysis', description: 'Understand uploaded form images.' },
    ]
  },
  {
    category: "Code Quality",
    items: [
      { id: 'html_validation', label: 'Strict HTML Validator', description: 'Ensure valid table nesting.' },
      { id: 'prettier_fmt', label: 'Auto Formatter', description: 'Run Prettier after generation.' },
      { id: 'explain_code', label: 'Explain Mode', description: 'Add comments and reasoning to output.' },
      { id: 'extract_colors', label: 'Color Extractor', description: 'Identify palette from images.' },
      { id: 'diff_check', label: 'Diff Checker', description: 'Show changes before applying.' },
    ]
  },
  {
    category: "Utilities",
    items: [
      { id: 'calculator', label: 'Math Engine', description: 'Verify invoice totals/taxes.' },
      { id: 'currency_convert', label: 'Currency Converter', description: 'Convert rates via search.' },
      { id: 'translator', label: 'Auto Translate', description: 'Translate labels to target language.' },
      { id: 'lorem_ipsum', label: 'Lorem Generator', description: 'Fill tables with dummy data.' },
      { id: 'generate_docs', label: 'Doc Generator', description: 'Create documentation for the form.' },
      { id: 'unit_test', label: 'Test Generator', description: 'Create validation tests.' },
    ]
  }
];

// Flattens the nested structure to get a simple array of all IDs
// This makes maintenance cheap: add a tool above, and it's automatically "default on" everywhere.
export const ALL_TOOL_IDS = AVAILABLE_TOOLS.flatMap(category => 
  category.items.map(tool => tool.id)
);
