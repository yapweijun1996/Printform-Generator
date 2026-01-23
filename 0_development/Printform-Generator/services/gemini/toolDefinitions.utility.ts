import { FunctionDeclaration, Type } from '@google/genai';

/**
 * Diff check tool
 * Computes a preview of changes without applying them.
 */
export const diffCheckTool: FunctionDeclaration = {
  name: 'diff_check',
  description:
    'Preview the diff that would be applied to the active file. Use this before modifying code when you want to avoid regressions.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      operation: {
        type: Type.STRING,
        enum: ['replace', 'rewrite', 'insert_before', 'insert_after'],
        description: 'Preview a replace/rewrite, or an insert before/after a target snippet.',
      },
      search_snippet: {
        type: Type.STRING,
        description: 'Exact string to find (required for replace).',
      },
      target_snippet: {
        type: Type.STRING,
        description: 'Exact anchor snippet (required for insert_before/insert_after).',
      },
      new_code: {
        type: Type.STRING,
        description: 'The new code that would be inserted/applied.',
      },
    },
    required: ['operation', 'new_code'],
  },
};

/**
 * Print-safe validator tool
 * Checks PrintForm.js + ERP table constraints for compatibility.
 */
export const printSafeValidatorTool: FunctionDeclaration = {
  name: 'print_safe_validator',
  description:
    'Validate the active HTML for PrintForm.js + ERP print constraints (printform root, required data-attrs, strict tables/colgroup, inline styles, etc).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      pageWidth: {
        type: Type.STRING,
        description: 'Configured page width (e.g. "750px"). If provided, validator compares against the root style.',
      },
      pageHeight: {
        type: Type.STRING,
        description: 'Configured page height (e.g. "1050px"). If provided, validator compares against the root style.',
      },
      max_issues: {
        type: Type.INTEGER,
        description: 'Maximum number of issues to return (default 50).',
      },
    },
    required: [],
  },
};

/**
 * Load reference template tool
 * Loads example HTML files from printform-js/ directory for learning and reference.
 */
export const loadReferenceTemplateTool: FunctionDeclaration = {
  name: 'load_reference_template',
  description:
    'Load a reference HTML template from the printform-js/ examples directory. Use this to learn the correct PrintForm.js structure, data attributes, and styling patterns before generating new forms.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      template_name: {
        type: Type.STRING,
        description:
          'Name of the template file to load (e.g. "demo001.html", "index.html"). Leave empty to list available templates.',
      },
      max_chars: {
        type: Type.INTEGER,
        description: 'Maximum characters to return (default 30000).',
      },
    },
    required: [],
  },
};
