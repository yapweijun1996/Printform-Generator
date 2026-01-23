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
      require_printformjs: {
        type: Type.BOOLEAN,
        description:
          'If true, missing required PrintForm.js sections become errors (e.g. .pheader, .prowheader, .pfooter_pagenum).',
      },
      require_three_page_test: {
        type: Type.BOOLEAN,
        description:
          'If true, requires enough .prowitem rows to reach multiple pages (recommended 20~30 rows for quick testing).',
      },
      min_prowitem_count: {
        type: Type.INTEGER,
        description: 'Minimum required .prowitem count when require_three_page_test=true (default 20).',
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
 * Strict HTML validator tool
 * Focuses on valid table nesting rules (thead/tbody/tr/td/colgroup, etc).
 */
export const htmlValidationTool: FunctionDeclaration = {
  name: 'html_validation',
  description: 'Validate strict HTML table nesting (best-effort). Flags invalid parent/child relationships in tables.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      max_issues: {
        type: Type.INTEGER,
        description: 'Maximum number of issues to return (default 80).',
      },
      allow_tr_directly_under_table: {
        type: Type.BOOLEAN,
        description: 'If true, allow <tr> directly under <table> (implicit <tbody>) (default true).',
      },
      allow_table_fragments_in_template: {
        type: Type.BOOLEAN,
        description: 'If true, relax rules inside <template> (common in PrintForm.js examples) (default true).',
      },
    },
    required: [],
  },
};

/**
 * Visual review tool
 * Requests a fresh (optionally higher-res) preview snapshot so the model can compare it with the reference image.
 */
export const visualReviewTool: FunctionDeclaration = {
  name: 'visual_review',
  description:
    'Request a fresh current preview snapshot for visual comparison. Use this when you need to confirm pixel-level details vs the reference image.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      scale: {
        type: Type.NUMBER,
        description: 'Snapshot scale multiplier (default 0.6; use ~1.0~1.6 for higher resolution).',
      },
      jpeg_quality: {
        type: Type.NUMBER,
        description: 'JPEG quality 0~1 (default 0.65; higher means larger payload).',
      },
      timeout_ms: {
        type: Type.INTEGER,
        description: 'Max wait time for a new snapshot (default 1500ms).',
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
