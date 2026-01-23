import { FunctionDeclaration, Type } from '@google/genai';

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
