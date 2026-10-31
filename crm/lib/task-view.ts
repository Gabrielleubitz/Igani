import { foldTasks, type CrmTask, type TaskLog } from '@/components/crm/crm-utils'

/** Fold task events and also return every task title ever created (so history can name deleted tasks). */
export function foldTasksFromLogs(logs: TaskLog[]): { tasks: CrmTask[]; titles: Map<string, string> } {
  const titles = new Map<string, string>()
  for (const l of [...logs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    const m = (l.metadata ?? {}) as Record<string, unknown>
    if (typeof m.taskId === 'string' && typeof m.title === 'string' && (l.action === 'task.created' || l.action === 'task.updated')) titles.set(m.taskId, m.title)
  }
  return { tasks: foldTasks(logs), titles }
}
