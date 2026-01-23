import { FunctionDeclaration, Type } from '@google/genai';

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
