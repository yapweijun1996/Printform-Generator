import { FunctionDeclaration, Type } from '@google/genai';

/**
 * 任务计划管理工具 (v2: extended state machine)
 *
 * New actions: block_task, unblock_task, attach_evidence, update_acceptance
 * Only manage_plan or the evaluator can advance task status.
 */
export const managePlanTool: FunctionDeclaration = {
  name: 'manage_plan',
  description:
    'Manage the Task Plan. IMPORTANT: This is the ONLY way to advance task status. Editing code does NOT auto-complete tasks. You MUST explicitly call mark_completed when a task is truly done.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        enum: [
          'create_plan',
          'mark_completed',
          'mark_in_progress',
          'mark_failed',
          'add_task',
          'block_task',
          'unblock_task',
          'attach_evidence',
          'update_acceptance',
        ],
        description:
          'create_plan: Overwrites list with new tasks. add_task: Append tasks. mark_in_progress: Start working (max 1 at a time). mark_completed: Mark done. mark_failed: Mark failed. block_task: Add blocker. unblock_task: Remove blocker. attach_evidence: Add evidence. update_acceptance: Set acceptance criteria.',
      },
      tasks: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'List of task descriptions. Required for "create_plan" or "add_task".',
      },
      task_index: {
        type: Type.INTEGER,
        description: 'Index of the task to update (0-based). Alternative to task_id.',
      },
      task_id: {
        type: Type.STRING,
        description: 'ID of the task to update. Alternative to task_index.',
      },
      failure_reason: {
        type: Type.STRING,
        description: 'If marking as failed, provide a short reason.',
      },
      blocked_by_id: {
        type: Type.STRING,
        description: 'Task ID that is blocking. Required for block_task, optional for unblock_task.',
      },
      evidence: {
        type: Type.STRING,
        description: 'Evidence text to attach (e.g. validator result, observation).',
      },
      acceptance_criteria: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Acceptance criteria strings. Required for update_acceptance.',
      },
    },
    required: ['action'],
  },
};
