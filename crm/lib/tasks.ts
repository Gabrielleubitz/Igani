import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { TASK_ACTIONS, foldTasks, type CrmTask, type TaskPriority } from '@/components/crm/crm-utils'
import { logActivity } from './audit'
import { prisma } from './prisma'

/** System-created task (same activity-log shape the UI folds into task state). */
export async function createAutoTask(
  t: { leadId: string; title: string; dueAt: Date; assigneeId: string | null; priority?: TaskPriority; auto: 'prep' | 'follow-up'; bookingId: string },
  db?: Prisma.TransactionClient,
): Promise<void> {
  await logActivity(
    {
      entityType: 'LEAD',
      entityId: t.leadId,
      action: 'task.created',
      metadata: { taskId: randomUUID(), title: t.title, dueAt: t.dueAt.toISOString(), assigneeId: t.assigneeId, priority: t.priority ?? 'MEDIUM', auto: t.auto, bookingId: t.bookingId },
    },
    db,
  )
}

/** Current state of every task, optionally limited to some leads. Only task events are read. */
export async function loadTasks(leadIds?: string[]): Promise<CrmTask[]> {
  const logs = await prisma.activityLog.findMany({
    where: { entityType: 'LEAD', action: { in: [...TASK_ACTIONS] }, ...(leadIds ? { entityId: { in: leadIds } } : {}) },
    select: { entityId: true, action: true, createdAt: true, metadata: true },
    orderBy: { createdAt: 'asc' },
  })
  return foldTasks(logs)
}

/** Tasks a user should act on: assigned to them, or unassigned on a contact they own. */
export function isMyTask(t: CrmTask, userId: string, leadOwner: string | null | undefined): boolean {
  return t.assigneeId === userId || (t.assigneeId === null && leadOwner === userId)
}
