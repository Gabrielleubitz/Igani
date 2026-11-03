import 'server-only'
import { TASK_ACTIONS, foldTasks, type CrmTask } from '@/components/crm/crm-utils'
import { removeEntryFromGoogle } from './calendar-entry-sync'
import { prisma } from './prisma'

/**
 * Team tasks: tasks given to a person that are not about a contact ("Prepare the Q4 report"). Like meeting action items
 * they live as task events on the assignee (entityType USER, entityId = assignee); they are told apart by auto: 'team'.
 * Any task (team or contact) can carry a calendarEntryId: a block on the assignee's Today calendar (synced to Google).
 */

export interface TeamTask extends CrmTask {
  /** The assignee (USER task events are stored on them) */
  ownerId: string
  createdById: string | null
  calendarEntryId: string | null
}

interface CreatedMeta {
  taskId?: string
  auto?: string
  calendarEntryId?: string
}

export async function loadTeamTasks(ownerId?: string): Promise<TeamTask[]> {
  const logs = await prisma.activityLog.findMany({
    where: { entityType: 'USER', action: { in: [...TASK_ACTIONS] }, ...(ownerId ? { entityId: ownerId } : {}) },
    select: { entityId: true, action: true, createdAt: true, metadata: true, actorId: true },
    orderBy: { createdAt: 'asc' },
  })
  const meta = new Map<string, { actorId: string | null; calendarEntryId: string | null }>()
  for (const l of logs) {
    const m = l.metadata as CreatedMeta | null
    if (l.action === 'task.created' && m?.taskId && m.auto === 'team') meta.set(m.taskId, { actorId: l.actorId, calendarEntryId: m.calendarEntryId ?? null })
  }
  return foldTasks(logs)
    .filter((t) => meta.has(t.id))
    .map((t) => ({ ...t, ownerId: t.leadId, createdById: meta.get(t.id)!.actorId, calendarEntryId: meta.get(t.id)!.calendarEntryId }))
}

/** Who created each task (contact or team), by task id: drives the "Assigned by me" view. */
export async function taskCreators(taskIds: string[]): Promise<Map<string, string | null>> {
  if (!taskIds.length) return new Map()
  const rows = await prisma.activityLog.findMany({
    where: { action: 'task.created', entityType: { in: ['LEAD', 'USER'] }, OR: taskIds.map((id) => ({ metadata: { path: ['taskId'], equals: id } })) },
    select: { actorId: true, metadata: true },
  })
  return new Map(rows.map((r) => [(r.metadata as CreatedMeta).taskId ?? '', r.actorId]))
}

/** Removes the calendar block a task put on someone's calendar (and its Google event). Safe when there is none. */
export async function removeTaskCalendarEntry(taskId: string): Promise<void> {
  const created = await prisma.activityLog.findFirst({ where: { action: 'task.created', metadata: { path: ['taskId'], equals: taskId } }, select: { metadata: true } })
  const entryId = (created?.metadata as CreatedMeta | null)?.calendarEntryId
  if (!entryId) return
  const entry = await prisma.calendarEntry.findUnique({ where: { id: entryId }, select: { id: true, ownerId: true, googleEventId: true } })
  if (!entry) return
  await prisma.calendarEntry.delete({ where: { id: entry.id } })
  await removeEntryFromGoogle(entry.ownerId, entry.googleEventId)
}
