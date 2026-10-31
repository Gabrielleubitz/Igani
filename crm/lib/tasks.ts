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

export interface TaskLead {
  id: string
  assignedToId: string | null
  email: string | null
  phone: string | null
  firstName: string | null
  lastName: string | null
  company: string | null
}

/**
 * Tasks a user can act on, in one place so the banner, Today, Tasks page and reminders always agree:
 * only tasks on contacts that still exist, are not archived, and the user can see (admins: all contacts).
 * `mine` = assigned to the user, or unassigned on a contact the user owns.
 */
export async function tasksForUser(user: { id: string; role: string }): Promise<{ all: CrmTask[]; mine: CrmTask[]; leads: Map<string, TaskLead> }> {
  const leadRows = await prisma.lead.findMany({
    where: { archived: false, ...(user.role === 'ADMIN' ? {} : { OR: [{ assignedToId: user.id }, { assignedToId: null }] }) },
    select: { id: true, assignedToId: true, email: true, phone: true, firstName: true, lastName: true, company: true },
  })
  const leads = new Map(leadRows.map((l) => [l.id, l]))
  const all = (await loadTasks(user.role === 'ADMIN' ? undefined : leadRows.map((l) => l.id))).filter((t) => leads.has(t.leadId))
  const mine = all.filter((t) => isMyTask(t, user.id, leads.get(t.leadId)?.assignedToId))
  return { all, mine, leads }
}

/** Who should act on a task: its assignee, or the contact's owner when the task is unassigned. */
export function taskOwner(t: CrmTask, leadOwner: string | null | undefined): string | null {
  return t.assigneeId ?? leadOwner ?? null
}

/** Remove open auto-created tasks linked to a booking (e.g. "Prep for call" when the meeting is cancelled). */
export async function deleteAutoTasksForBooking(bookingId: string, leadId: string, actorId: string | null, db?: Prisma.TransactionClient): Promise<void> {
  const tasks = (await loadTasks([leadId])).filter((t) => !t.done && t.auto)
  const created = await (db ?? prisma).activityLog.findMany({
    where: { entityType: 'LEAD', entityId: leadId, action: 'task.created', metadata: { path: ['bookingId'], equals: bookingId } },
    select: { metadata: true },
  })
  const ids = new Set(created.map((c) => (c.metadata as { taskId?: string } | null)?.taskId))
  for (const t of tasks.filter((x) => ids.has(x.id))) {
    await logActivity({ entityType: 'LEAD', entityId: leadId, actorId, action: 'task.deleted', metadata: { taskId: t.id, reason: 'meeting-cancelled' } }, db)
  }
}
