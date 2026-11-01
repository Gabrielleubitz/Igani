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
  const b = line.match(/^\s*\[([^\]]{1,40})\]\s*(.+)$/) // "[Dana] send the proposal" (Gemini import format)
  if (b && b[1]!.trim().split(/\s+/).length <= 3) return { who: b[1]!.trim(), title: b[2]!.trim() }
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

/** True when a name fits more than one teammate (so we can't say it is an outsider). */
function isAmbiguous(who: string, people: Person[]): boolean {
  const w = who.toLowerCase()
  return people.filter((p) => (p.name ?? '').toLowerCase().split(/\s+/)[0] === w || (p.email ?? '').toLowerCase().split('@')[0] === w).length > 1
}

/** Gemini footer lines that the notes parser sometimes picks up as "actions". */
export const isBoilerplate = (t: string): boolean => /^(want to see more\?|you should review gemini)/i.test(t.trim())

export interface FollowUp {
  who: string
  title: string
}

const cap = (t: string): string => (t.charAt(0).toUpperCase() + t.slice(1)).slice(0, 200)

/**
 * Splits a call's action items (pure): team tasks (named teammate, or nobody named -> host)
 * and follow-ups owned by a named person who is NOT on the team (client, partner...).
 */
export function classifyActions(actions: string[], people: Person[], hostId: string): { tasks: { assigneeId: string; title: string }[]; followUps: FollowUp[] } {
  const tasks: { assigneeId: string; title: string }[] = []
  const followUps: FollowUp[] = []
  for (const a of actions.map(splitAction).filter((x) => x.title.length > 1 && !isBoilerplate(x.title))) {
    const hit = matchPerson(a.who, people)
    if (hit) tasks.push({ assigneeId: hit.id, title: cap(a.title) })
    else if (a.who && !isAmbiguous(a.who, people)) followUps.push({ who: a.who, title: cap(a.title) })
    else tasks.push({ assigneeId: hostId, title: cap(a.title) })
  }
  return { tasks, followUps }
}

/** Team tasks only (one per action item; unnamed/ambiguous owners fall to the host). */
export function planMeetingTasks(actions: string[], people: Person[], hostId: string): { assigneeId: string; title: string }[] {
  return classifyActions(actions, people, hostId).tasks
}

export interface MeetingActionItems {
  bookingId: string
  title: string
  /** Per teammate: their action items (with done state when a task exists). */
  team: { personId: string; name: string; items: { title: string; done: boolean | null }[] }[]
  /** Items owned by people outside the team. */
  followUps: FollowUp[]
}

/** Fetches a call's action items grouped per team member, plus follow-ups for people who aren't on the team. */
export async function getMeetingActionItems(bookingId: string): Promise<MeetingActionItems | null> {
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: { meeting: true } })
  if (!b?.meeting) return null
  const notes = organizedFor(b.meeting).notes
  const people = await prisma.user.findMany({ where: { role: { not: null } }, select: { id: true, name: true, email: true } })
  const { tasks, followUps } = classifyActions(notes?.actions ?? [], people, b.hostId)
  const done = new Map<string, boolean>()
  for (const t of await loadMeetingTasks()) done.set(`${t.assigneeId}|${t.title}`, t.done)
  const byId = new Map(people.map((p) => [p.id, p]))
  const team = new Map<string, MeetingActionItems['team'][number]>()
  for (const t of tasks) {
    const p = byId.get(t.assigneeId)
    const e = team.get(t.assigneeId) ?? team.set(t.assigneeId, { personId: t.assigneeId, name: p?.name ?? p?.email ?? 'Teammate', items: [] }).get(t.assigneeId)!
    e.items.push({ title: t.title, done: done.get(`${t.assigneeId}|${t.title}`) ?? null })
  }
  return { bookingId, title: b.title, team: [...team.values()], followUps }
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
  const everyone = await prisma.user.findMany({ where: { role: { not: null } }, select: { id: true, name: true, email: true } })
  const plan = planMeetingTasks(notes.actions, everyone.length ? everyone : people.length ? people : [b.host], b.hostId)
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
