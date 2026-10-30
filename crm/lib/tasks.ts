import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import type { TaskPriority } from '@/components/crm/crm-utils'
import { logActivity } from './audit'

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
