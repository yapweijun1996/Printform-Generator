import { FunctionDeclaration, Type } from '@google/genai';

/**
 * 工具定义模块
 * 包含所有 Gemini Function Calling 工具的声明
 */

/**
 * 代码修改工具
 * 支持替换(replace)和重写(rewrite)两种操作模式
 */
export const modifyCodeTool: FunctionDeclaration = {
  name: 'modify_code',
  description:
    'Modify the code. Use "replace" for small edits (search & replace) and "rewrite" ONLY for full file restructuring.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      operation: {
        type: Type.STRING,
        enum: ['replace', 'rewrite'],
        description:
          'Use "replace" to find and replace a snippet. Use "rewrite" ONLY if you need to change >50% of the file.',
      },
      search_snippet: {
        type: Type.STRING,
        description:
          'Exact string to find in the existing code. REQUIRED if operation is "replace". Must match character-for-character.',
      },
      new_code: {
        type: Type.STRING,
        description: 'The new code to insert. If operation is "rewrite", this is the full file content.',
      },
      change_description: {
        type: Type.STRING,
        description: 'A short summary of what changed (e.g., "Added tax column"). Used for the Audit Log.',
      },
    },
    required: ['operation', 'new_code', 'change_description'],
  },
};

/**
 * 内容插入工具
 * 在指定代码片段前后插入新内容
 */
export const insertContentTool: FunctionDeclaration = {
  name: 'insert_content',
  description:
    'Insert new code/tags before or after a specific snippet. Best for adding new columns, rows, or styles without rewriting.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      target_snippet: {
        type: Type.STRING,
        description: 'The existing code snippet to use as an anchor/reference point.',
      },
      position: {
        type: Type.STRING,
        enum: ['before', 'after'],
        description: 'Where to insert the new code relative to the target_snippet.',
      },
      new_code: {
        type: Type.STRING,
        description: 'The new HTML/CSS code to insert.',
      },
      change_description: {
        type: Type.STRING,
        description: 'A short summary of what changed (e.g., "Added footer row"). Used for the Audit Log.',
      },
    },
    required: ['target_snippet', 'position', 'new_code', 'change_description'],
  },
};

/**
 * 任务计划管理工具
 * 用于创建、更新和管理任务列表
 */
export const managePlanTool: FunctionDeclaration = {
  name: 'manage_plan',
  description:
    'Manage the Task List. Use this to break down complex user requests into steps, or update the status of tasks as you complete them.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        enum: ['create_plan', 'mark_completed', 'mark_in_progress', 'mark_failed', 'add_task'],
        description:
          'create_plan: Overwrites list. mark_in_progress: Set status to running. mark_completed: Set status to done. mark_failed: Set status to failed.',
      },
      tasks: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'List of task descriptions. Required for "create_plan" or "add_task".',
      },
      task_index: {
        type: Type.INTEGER,
        description: 'Index of the task to update (0-based). Required for status updates.',
      },
      failure_reason: {
        type: Type.STRING,
        description: 'If marking as failed, provide a short reason.',
      },
    },
    required: ['action'],
  },
};

/**
 * Undo last change tool
 * Reverts the active file to the most recent history snapshot.
 */
export const undoLastTool: FunctionDeclaration = {
  name: 'undo_last',
  description: 'Undo the most recent change to the active file (revert to last history snapshot).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      change_description: {
        type: Type.STRING,
        description: 'A short summary of why this undo is requested. Used for the Audit Log.',
      },
    },
    required: [],
  },
};

/**
 * Read current file tool
 * Returns the active file content for grounding.
 */
export const readFileTool: FunctionDeclaration = {
  name: 'read_file',
  description: 'Read the active file content and return it as text.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      max_chars: {
        type: Type.INTEGER,
        description: 'Maximum characters to return (default 20000).',
      },
    },
    required: [],
  },
};

/**
 * Read all files tool
 * Returns all in-app project files (from the app file manager).
 */
export const readAllFilesTool: FunctionDeclaration = {
  name: 'read_all_files',
  description: 'Read all project files managed inside the app (name + content).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      max_chars_per_file: {
        type: Type.INTEGER,
        description: 'Maximum characters per file to return (default 12000).',
      },
      max_total_chars: {
        type: Type.INTEGER,
        description: 'Maximum total characters across all files (default 30000).',
      },
    },
    required: [],
  },
};

/**
 * Grep search tool
 * Searches for a string/regex pattern across project files.
 */
export const grepSearchTool: FunctionDeclaration = {
  name: 'grep_search',
  description: 'Search for a pattern across project files and return matches with file + line numbers.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      pattern: {
        type: Type.STRING,
        description: 'A JavaScript regex pattern string (without / /).',
      },
      flags: {
        type: Type.STRING,
        description: 'Regex flags, e.g. "i", "g", "m". Default "i".',
      },
      scope: {
        type: Type.STRING,
        enum: ['active', 'all'],
        description: 'Search scope: active file only, or all project files.',
      },
      max_matches: {
        type: Type.INTEGER,
        description: 'Maximum number of match lines to return (default 50).',
      },
    },
    required: ['pattern'],
  },
};

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

/**
 * 获取所有可用的工具定义
 */
export const getAllTools = () => ({
  modifyCodeTool,
  insertContentTool,
  managePlanTool,
  undoLastTool,
  readFileTool,
  readAllFilesTool,
  grepSearchTool,
  diffCheckTool,
  printSafeValidatorTool,
  loadReferenceTemplateTool,
});
