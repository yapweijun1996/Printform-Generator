import { FunctionDeclaration, Type } from '@google/genai';

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
