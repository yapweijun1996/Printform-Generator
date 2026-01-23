import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { AgentTask } from '../../types';
import type { ToolExecutionResult } from './toolTypes';

export const executeManagePlan = async (
  args: any,
  tasksRef: MutableRefObject<AgentTask[]>,
  setTasks: Dispatch<SetStateAction<AgentTask[]>>,
): Promise<ToolExecutionResult> => {
  const { action, tasks: newTasksList, task_index, failure_reason } = args;

  const updateTasks = (newTaskList: AgentTask[]) => {
    setTasks(newTaskList);
    tasksRef.current = newTaskList;
  };

  if (action === 'create_plan') {
    if (!Array.isArray(newTasksList) || newTasksList.length === 0) {
      return { success: false, output: 'Error: tasks is required (non-empty array) for create_plan.' };
    }
    const generatedTasks = newTasksList.map((desc: string, i: number) => ({
      id: `task-${Date.now()}-${i}`,
      description: desc,
      status: i === 0 ? ('in_progress' as const) : ('pending' as const),
    }));
    updateTasks(generatedTasks as AgentTask[]);
    return { success: true, output: `Created plan with ${generatedTasks.length} tasks.` };
  }

  if (action === 'add_task') {
    if (!Array.isArray(newTasksList) || newTasksList.length === 0) {
      return { success: false, output: 'Error: tasks is required (non-empty array) for add_task.' };
    }
    const additionalTasks = newTasksList.map((desc: string, i: number) => ({
      id: `task-add-${Date.now()}-${i}`,
      description: desc,
      status: 'pending' as const,
    }));
    updateTasks([...(tasksRef.current || []), ...(additionalTasks as AgentTask[])]);
    return { success: true, output: `Added ${additionalTasks.length} tasks.` };
  }

  if (action === 'mark_completed') {
    const updated = (tasksRef.current || []).map((t, i) =>
      i === task_index ? { ...t, status: 'completed' as const } : t,
    );
    updateTasks(updated);
    return { success: true, output: `Marked task #${task_index + 1} as completed.` };
  }

  if (action === 'mark_in_progress') {
    const updated = (tasksRef.current || []).map((t, i) =>
      i === task_index ? { ...t, status: 'in_progress' as const } : t,
    );
    updateTasks(updated);
    return { success: true, output: `Started working on task #${task_index + 1}.` };
  }

  if (action === 'mark_failed') {
    const updated = (tasksRef.current || []).map((t, i) =>
      i === task_index
        ? { ...t, status: 'failed' as const, description: `${t.description} (Failed: ${failure_reason || 'Unknown'})` }
        : t,
    );
    updateTasks(updated);
    return { success: true, output: `Marked task #${task_index + 1} as failed.` };
  }

  return { success: false, output: `Unknown action: ${action}` };
};
