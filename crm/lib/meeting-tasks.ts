import { randomUUID } from 'node:crypto'
import { foldTasks, TASK_ACTIONS, type CrmTask } from '@/components/crm/crm-utils'
import { logActivity } from './audit'
import { organizedFor } from './organize-notes'
import { prisma } from './prisma'

/** Meeting action items live as task events on the assignee (entityType USER), same fold as contact tasks. */
export interface Person {
  id: string
  name: string | null
  email: string | null
}

/** "Dana: send the proposal" -> { who: "Dana", title: "send the proposal" }; no owner -> who null. */
export function splitAction(line: string): { who: string | null; title: string } {
  const m = line.match(/^\s*([^:：]{1,40})[:：]\s+(.+)$/)
  if (m && m[1]!.trim().split(/\s+/).length <= 3) return { who: m[1]!.trim(), title: m[2]!.trim() }
  return { who: null, title: line.trim() }
}

/** Picks the teammate a name refers to (full name, first name or email prefix); null if unknown/ambiguous. */
export function matchPerson(who: string | null, people: Person[]): Person | null {
  if (!who) return null
  const w = who.toLowerCase()
  const hits = people.filter((p) => {
    const name = (p.name ?? '').toLowerCase()
    return (name && (name === w || name.split(/\s+/)[0] === w)) || (p.email ?? '').toLowerCase().split('@')[0] === w
  })
  return hits.length === 1 ? hits[0]! : null
}

/** One task per action item; unmatched owners fall to the host. Returns the planned tasks (pure). */
export function planMeetingTasks(actions: string[], people: Person[], hostId: string): { assigneeId: string; title: string }[] {
  return actions
    .map(splitAction)
    .filter((a) => a.title.length > 1)
    .map((a) => ({ assigneeId: matchPerson(a.who, people)?.id ?? hostId, title: (a.title.charAt(0).toUpperCase() + a.title.slice(1)).slice(0, 200) }))
}

/** Turns a call's action items into tasks on each person's list. Safe to call twice: does nothing if already created. */
export async function createMeetingTasks(bookingId: string): Promise<number> {
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: { meeting: true, host: { select: { id: true, name: true, email: true } } } })
  if (!b?.meeting || b.source !== 'TEAM_MEETING') return 0
  const dup = await prisma.activityLog.findFirst({ where: { entityType: 'USER', action: 'task.created', metadata: { path: ['bookingId'], equals: bookingId } }, select: { id: true } })
  if (dup) return 0
  const notes = organizedFor(b.meeting).notes
  if (!notes?.actions.length) return 0
  const emails = (Array.isArray(b.attendees) ? b.attendees : []).filter((e): e is string => typeof e === 'string').map((e) => e.toLowerCase())
  const people = await prisma.user.findMany({ where: { role: { not: null }, OR: [{ email: { in: emails, mode: 'insensitive' } }, { id: b.hostId }] }, select: { id: true, name: true, email: true } })
  const plan = planMeetingTasks(notes.actions, people.length ? people : [b.host], b.hostId)
  for (const t of plan) {
    await logActivity({ entityType: 'USER', entityId: t.assigneeId, action: 'task.created', metadata: { taskId: randomUUID(), title: t.title, dueAt: null, assigneeId: t.assigneeId, priority: 'MEDIUM', auto: 'meeting', bookingId, meetingTitle: b.title } })
  }
  return plan.length
}

export interface MeetingTask extends CrmTask {
  meetingTitle: string | null
}

/** All meeting tasks (optionally one person's). */
export async function loadMeetingTasks(userId?: string): Promise<MeetingTask[]> {
  const logs = await prisma.activityLog.findMany({
    where: { entityType: 'USER', action: { in: [...TASK_ACTIONS] }, ...(userId ? { entityId: userId } : {}) },
    select: { entityId: true, action: true, createdAt: true, metadata: true },
    orderBy: { createdAt: 'asc' },
  })
  const titles = new Map<string, string | null>()
  for (const l of logs) {
    const m = l.metadata as { taskId?: string; meetingTitle?: string } | null
    if (l.action === 'task.created' && m?.taskId) titles.set(m.taskId, m.meetingTitle ?? null)
  }
  return foldTasks(logs).map((t) => ({ ...t, meetingTitle: titles.get(t.id) ?? null }))
}

/** Set a meeting task done/open for its owner (only the owner or an admin). */
export async function setMeetingTaskDone(actor: { id: string; role: string }, ownerId: string, taskId: string, done: boolean): Promise<void> {
  if (actor.id !== ownerId && actor.role !== 'ADMIN') throw new Error('Not your task.')
  const t = (await loadMeetingTasks(ownerId)).find((x) => x.id === taskId)
  if (!t) throw new Error('Task not found.')
  if (t.done === done) return
  await logActivity({ entityType: 'USER', entityId: ownerId, actorId: actor.id, action: done ? 'task.completed' : 'task.reopened', metadata: { taskId } })
}

/** Creates tasks for team meetings whose notes were pulled before this feature existed (no-op for ones already done). */
export async function backfillMeetingTasks(): Promise<number> {
  const rows = await prisma.booking.findMany({ where: { source: 'TEAM_MEETING', status: { not: 'CANCELLED' }, meeting: { is: { notesStatus: 'READY' } } }, select: { id: true } })
  let n = 0
  for (const r of rows) n += await createMeetingTasks(r.id).catch(() => 0)
  return n
}
