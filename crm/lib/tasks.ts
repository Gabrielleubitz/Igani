import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { TASK_ACTIONS, foldTasks, type CrmTask, type TaskPriority } from '@/components/crm/crm-utils'
import { logActivity } from './audit'
import { prisma } from './prisma'
import { notArchivedBy } from './lead-archive'

/** System-created task (same activity-log shape the UI folds into task state). */
export async function createAutoTask(
  t: { leadId: string; title: string; dueAt: Date; assigneeId: string | null; priority?: TaskPriority; auto: 'prep' | 'follow-up' | 'invoice' | 'callback' | 'email-reply'; bookingId?: string; offerId?: string; callId?: string; emailId?: string },
  db?: Prisma.TransactionClient,
): Promise<string> {
  const taskId = randomUUID()
  await logActivity(
    {
      entityType: 'LEAD',
      entityId: t.leadId,
      action: 'task.created',
      metadata: { taskId, title: t.title, dueAt: t.dueAt.toISOString(), assigneeId: t.assigneeId, priority: t.priority ?? 'MEDIUM', auto: t.auto, ...(t.bookingId ? { bookingId: t.bookingId } : {}), ...(t.offerId ? { offerId: t.offerId } : {}), ...(t.callId ? { callId: t.callId } : {}), ...(t.emailId ? { emailId: t.emailId } : {}) },
    },
    db,
  )
  return taskId
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
 * only tasks on contacts that still exist, are not archived by this user, and the user can see (admins: all contacts).
 * `mine` = assigned to the user, or unassigned on a contact the user owns.
 */
export async function tasksForUser(user: { id: string; role: string }): Promise<{ all: CrmTask[]; mine: CrmTask[]; leads: Map<string, TaskLead> }> {
  const leadRows = await prisma.lead.findMany({
    where: { ...notArchivedBy(user.id), ...(user.role === 'ADMIN' ? {} : { assignedToId: user.id }) },
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

/**
 * When a lead changes hands, the previous owner's open tasks on it follow it (to the new owner, or to nobody when the lead
 * is unassigned). Otherwise those tasks would be invisible to everyone and keep emailing someone who can no longer open the lead.
 */
export async function moveOpenTasks(leadId: string, fromUserId: string | null, toUserId: string | null, actorId: string | null, db: Prisma.TransactionClient): Promise<number> {
  if (!fromUserId || fromUserId === toUserId) return 0
  const logs = await db.activityLog.findMany({
    where: { entityType: 'LEAD', entityId: leadId, action: { in: [...TASK_ACTIONS] } },
    select: { entityId: true, action: true, createdAt: true, metadata: true },
    orderBy: { createdAt: 'asc' },
  })
  const mine = foldTasks(logs).filter((t) => !t.done && t.assigneeId === fromUserId)
  for (const t of mine) {
    await logActivity({ entityType: 'LEAD', entityId: leadId, actorId, action: 'task.updated', metadata: { taskId: t.id, assigneeId: toUserId, reason: 'lead-reassigned' } }, db)
  }
  return mine.length
}

/** Can this person open the lead a task is on? Admins can open any; everyone else only the leads they own. */
export function canOpenLeadTask(user: { id: string; role: string | null }, lead: { assignedToId: string | null } | undefined): boolean {
  if (!lead) return false
  return user.role === 'ADMIN' || lead.assignedToId === user.id
}
