import type { Tool, ToolContext, ToolResult } from '../Tool';
import type { AgentTask } from '../../../types';

export const managePlanTool: Tool = {
  name: 'manage_plan',
  friendlyName: 'Manage Plan',
  statusText: 'Updating project plan...',
  isConcurrencySafe: false,
  isDestructive: false,

  async call(args: any, context: ToolContext): Promise<ToolResult> {
    const { action, tasks: newTasksList, task_index, failure_reason, task_id, evidence: evidenceText, acceptance_criteria, blocked_by_id } = args;

    const updateTasks = (newTaskList: AgentTask[]) => {
      context.setTasks(newTaskList);
      context.tasksRef.current = newTaskList;
    };

    const currentTasks = context.tasksRef.current || [];

    // ── create_plan ──
    if (action === 'create_plan') {
      if (!Array.isArray(newTasksList) || newTasksList.length === 0) {
        return { success: false, output: 'Error: tasks is required (non-empty array) for create_plan.' };
      }
      const generatedTasks: AgentTask[] = newTasksList.map((desc: string, i: number) => ({
        id: `task-${Date.now()}-${i}`,
        description: desc,
        status: i === 0 ? 'in_progress' : 'pending',
        acceptanceCriteria: [],
        dependsOn: [],
        blockedBy: [],
        evidence: [],
      }));
      updateTasks(generatedTasks);
      return {
        success: true,
        output: `Created plan with ${generatedTasks.length} tasks.`,
        stateDelta: { planCreated: true, taskCount: generatedTasks.length },
      };
    }

    // ── add_task ──
    if (action === 'add_task') {
      if (!Array.isArray(newTasksList) || newTasksList.length === 0) {
        return { success: false, output: 'Error: tasks is required (non-empty array) for add_task.' };
      }
      const additionalTasks: AgentTask[] = newTasksList.map((desc: string, i: number) => ({
        id: `task-add-${Date.now()}-${i}`,
        description: desc,
        status: 'pending',
        acceptanceCriteria: [],
        dependsOn: [],
        blockedBy: [],
        evidence: [],
      }));
      updateTasks([...currentTasks, ...additionalTasks]);
      return {
        success: true,
        output: `Added ${additionalTasks.length} tasks.`,
        stateDelta: { tasksAdded: additionalTasks.length },
      };
    }

    // ── mark_in_progress ──
    if (action === 'mark_in_progress') {
      const idx = resolveTaskIndex(currentTasks, task_index, task_id);
      if (idx < 0 || idx >= currentTasks.length) {
        return { success: false, output: `Invalid task index/id: ${task_index ?? task_id}` };
      }

      const target = currentTasks[idx];

      // Check if blocked
      if (target.blockedBy && target.blockedBy.length > 0) {
        const completedIds = new Set(currentTasks.filter((t) => t.status === 'completed').map((t) => t.id));
        const stillBlocked = target.blockedBy.filter((id) => !completedIds.has(id));
        if (stillBlocked.length > 0) {
          return { success: false, output: `Cannot start: task is blocked by [${stillBlocked.join(', ')}]` };
        }
      }

      // Enforce single in_progress: demote any other in_progress task to pending
      const updated = currentTasks.map((t, i) => {
        if (i === idx) return { ...t, status: 'in_progress' as const };
        if (t.status === 'in_progress') return { ...t, status: 'pending' as const };
        return t;
      });
      updateTasks(updated);
      return {
        success: true,
        output: `Started working on task #${idx + 1}: ${target.description.slice(0, 80)}`,
        stateDelta: { activeTaskId: target.id },
      };
    }

    // ── mark_completed ──
    if (action === 'mark_completed') {
      const idx = resolveTaskIndex(currentTasks, task_index, task_id);
      if (idx < 0 || idx >= currentTasks.length) {
        return { success: false, output: `Invalid task index/id: ${task_index ?? task_id}` };
      }

      const updated = currentTasks.map((t, i) =>
        i === idx ? { ...t, status: 'completed' as const } : t,
      );

      // NOTE: No implicit auto-start of next task.
      // The model must explicitly call mark_in_progress to start the next task.
      // This ensures plan advancement is always explicit via manage_plan.

      updateTasks(updated);

      const nextPending = updated.find((t) => t.status === 'pending' && !(t.blockedBy && t.blockedBy.length > 0));
      return {
        success: true,
        output: `Marked task #${idx + 1} as completed.${nextPending ? ` Next pending task: "${nextPending.description.slice(0, 80)}". Use mark_in_progress to start it.` : ' No more pending tasks.'}`,
        stateDelta: { taskCompleted: currentTasks[idx].id },
        followupHints: nextPending
          ? [`Next pending task available: ${nextPending.id}. Call manage_plan with action=mark_in_progress to start it.`]
          : ['All tasks completed.'],
      };
    }

    // ── mark_failed ──
    if (action === 'mark_failed') {
      const idx = resolveTaskIndex(currentTasks, task_index, task_id);
      if (idx < 0 || idx >= currentTasks.length) {
        return { success: false, output: `Invalid task index/id: ${task_index ?? task_id}` };
      }
      const updated = currentTasks.map((t, i) =>
        i === idx
          ? { ...t, status: 'failed' as const, description: `${t.description} (Failed: ${failure_reason || 'Unknown'})` }
          : t,
      );
      updateTasks(updated);
      return {
        success: true,
        output: `Marked task #${idx + 1} as failed.`,
        stateDelta: { taskFailed: currentTasks[idx].id },
      };
    }

    // ── block_task ──
    if (action === 'block_task') {
      const idx = resolveTaskIndex(currentTasks, task_index, task_id);
      if (idx < 0 || idx >= currentTasks.length) {
        return { success: false, output: `Invalid task index/id: ${task_index ?? task_id}` };
      }
      if (!blocked_by_id) {
        return { success: false, output: 'Error: blocked_by_id is required for block_task.' };
      }
      const target = currentTasks[idx];
      const existingBlockers = target.blockedBy || [];
      if (existingBlockers.includes(blocked_by_id)) {
        return { success: true, output: `Task #${idx + 1} is already blocked by ${blocked_by_id}.` };
      }
      const updated = currentTasks.map((t, i) =>
        i === idx ? { ...t, blockedBy: [...existingBlockers, blocked_by_id] } : t,
      );
      updateTasks(updated);
      return {
        success: true,
        output: `Task #${idx + 1} is now blocked by ${blocked_by_id}.`,
        stateDelta: { taskBlocked: target.id },
      };
    }

    // ── unblock_task ──
    if (action === 'unblock_task') {
      const idx = resolveTaskIndex(currentTasks, task_index, task_id);
      if (idx < 0 || idx >= currentTasks.length) {
        return { success: false, output: `Invalid task index/id: ${task_index ?? task_id}` };
      }
      if (!blocked_by_id) {
        // Remove all blockers
        const updated = currentTasks.map((t, i) =>
          i === idx ? { ...t, blockedBy: [] } : t,
        );
        updateTasks(updated);
        return { success: true, output: `All blockers removed from task #${idx + 1}.` };
      }
      const target = currentTasks[idx];
      const updated = currentTasks.map((t, i) =>
        i === idx ? { ...t, blockedBy: (target.blockedBy || []).filter((id) => id !== blocked_by_id) } : t,
      );
      updateTasks(updated);
      return {
        success: true,
        output: `Removed blocker ${blocked_by_id} from task #${idx + 1}.`,
        stateDelta: { taskUnblocked: target.id },
      };
    }

    // ── attach_evidence ──
    if (action === 'attach_evidence') {
      const idx = resolveTaskIndex(currentTasks, task_index, task_id);
      if (idx < 0 || idx >= currentTasks.length) {
        return { success: false, output: `Invalid task index/id: ${task_index ?? task_id}` };
      }
      if (!evidenceText) {
        return { success: false, output: 'Error: evidence is required for attach_evidence.' };
      }
      const target = currentTasks[idx];
      const updated = currentTasks.map((t, i) =>
        i === idx ? { ...t, evidence: [...(target.evidence || []), evidenceText] } : t,
      );
      updateTasks(updated);
      return {
        success: true,
        output: `Evidence attached to task #${idx + 1}.`,
        stateDelta: { evidenceAttached: target.id },
      };
    }

    // ── update_acceptance ──
    if (action === 'update_acceptance') {
      const idx = resolveTaskIndex(currentTasks, task_index, task_id);
      if (idx < 0 || idx >= currentTasks.length) {
        return { success: false, output: `Invalid task index/id: ${task_index ?? task_id}` };
      }
      if (!Array.isArray(acceptance_criteria)) {
        return { success: false, output: 'Error: acceptance_criteria (array) is required for update_acceptance.' };
      }
      const updated = currentTasks.map((t, i) =>
        i === idx ? { ...t, acceptanceCriteria: acceptance_criteria } : t,
      );
      updateTasks(updated);
      return {
        success: true,
        output: `Updated acceptance criteria for task #${idx + 1} (${acceptance_criteria.length} criteria).`,
        stateDelta: { acceptanceUpdated: currentTasks[idx].id },
      };
    }

    return { success: false, output: `Unknown action: ${action}` };
  },
};

/**
 * Resolve a task by either numeric index or string ID
 */
const resolveTaskIndex = (tasks: AgentTask[], index?: number, id?: string): number => {
  if (typeof index === 'number') return index;
  if (id) return tasks.findIndex((t) => t.id === id);
  return -1;
};
