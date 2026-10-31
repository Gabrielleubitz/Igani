import type { LeadStatus } from '@prisma/client'

/** Escape one CSV cell; also neutralises spreadsheet formula injection (=, +, -, @). */
export function csvCell(v: unknown): string {
  let s = v == null ? '' : v instanceof Date ? v.toISOString() : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

export interface TaskLog {
  entityId: string
  action: string
  createdAt: Date
  metadata: unknown
}

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export interface CrmTask {
  id: string
  leadId: string
  title: string
  dueAt: Date | null
  assigneeId: string | null
  done: boolean
  priority: TaskPriority
  /** 'prep' / 'follow-up' for tasks the system created around meetings */
  auto: string | null
  createdAt: Date
  completedAt: Date | null
}

export const TASK_ACTIONS = ['task.created', 'task.completed', 'task.reopened', 'task.updated', 'task.deleted'] as const

const isPriority = (v: unknown): v is TaskPriority => (TASK_PRIORITIES as readonly unknown[]).includes(v)

/**
 * Tasks live in the activity log as events (`task.created`, `.updated`, `.completed`, `.reopened`, `.deleted`),
 * so every change keeps its history. Fold the events (oldest first) into each task's current state.
 */
export function foldTasks(logs: TaskLog[]): CrmTask[] {
  const tasks = new Map<string, CrmTask>()
  const sorted = [...logs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  for (const l of sorted) {
    const m = (l.metadata ?? {}) as Record<string, unknown>
    const taskId = typeof m.taskId === 'string' ? m.taskId : null
    if (!taskId) continue
    if (l.action === 'task.created') {
      tasks.set(taskId, {
        id: taskId,
        leadId: l.entityId,
        title: String(m.title ?? ''),
        dueAt: typeof m.dueAt === 'string' ? new Date(m.dueAt) : null,
        assigneeId: typeof m.assigneeId === 'string' ? m.assigneeId : null,
        done: false,
        priority: isPriority(m.priority) ? m.priority : 'MEDIUM',
        auto: typeof m.auto === 'string' ? m.auto : null,
        createdAt: l.createdAt,
        completedAt: null,
      })
      continue
    }
    const t = tasks.get(taskId)
    if (!t) continue
    if (l.action === 'task.completed') {
      t.done = true
      t.completedAt = l.createdAt
    } else if (l.action === 'task.reopened') {
      t.done = false
      t.completedAt = null
    } else if (l.action === 'task.deleted') {
      tasks.delete(taskId)
    } else if (l.action === 'task.updated') {
      if (typeof m.title === 'string' && m.title) t.title = m.title
      if ('dueAt' in m) t.dueAt = typeof m.dueAt === 'string' ? new Date(m.dueAt) : null
      if ('assigneeId' in m) t.assigneeId = typeof m.assigneeId === 'string' ? m.assigneeId : null
      if (isPriority(m.priority)) t.priority = m.priority
    }
  }
  return [...tasks.values()]
}

export interface LeadFilter {
  q?: string
  status?: string
  source?: string
  owner?: string // user id, 'none' for unassigned
}

export function filterLeads<T extends { email: string; firstName: string | null; lastName: string | null; company: string | null; phone: string | null; status: string; source: string; assignedToId: string | null }>(
  leads: T[],
  f: LeadFilter,
): T[] {
  const q = f.q?.trim().toLowerCase()
  return leads.filter((l) => {
    if (f.status && l.status !== f.status) return false
    if (f.source && l.source !== f.source) return false
    if (f.owner === 'none' ? l.assignedToId !== null : f.owner && l.assignedToId !== f.owner) return false
    if (q) {
      const hay = [l.email, l.firstName, l.lastName, l.company, l.phone].filter(Boolean).join(' ').toLowerCase()
      if (!q.split(/\s+/).every((w) => hay.includes(w))) return false
    }
    return true
  })
}

export interface Report {
  total: number
  byStatus: Record<string, number>
  bySource: { source: string; total: number; won: number }[]
  byOwner: { owner: string; total: number; won: number }[]
  winRate: number | null // won / (won + lost)
  perDay: { day: string; count: number }[] // last N days
}

export function buildReport(
  leads: { status: LeadStatus; source: string; assignedToId: string | null; createdAt: Date }[],
  ownerName: (id: string | null) => string,
  now: Date = new Date(),
  days = 30,
): Report {
  const byStatus: Record<string, number> = {}
  const src = new Map<string, { total: number; won: number }>()
  const own = new Map<string, { total: number; won: number }>()
  const bump = (m: Map<string, { total: number; won: number }>, k: string, won: boolean): void => {
    const e = m.get(k) ?? { total: 0, won: 0 }
    e.total++
    if (won) e.won++
    m.set(k, e)
  }
  const perDay = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) perDay.set(new Date(now.getTime() - i * 864e5).toISOString().slice(0, 10), 0)
  for (const l of leads) {
    byStatus[l.status] = (byStatus[l.status] ?? 0) + 1
    bump(src, l.source, l.status === 'WON')
    bump(own, ownerName(l.assignedToId), l.status === 'WON')
    const d = l.createdAt.toISOString().slice(0, 10)
    if (perDay.has(d)) perDay.set(d, (perDay.get(d) ?? 0) + 1)
  }
  const won = byStatus.WON ?? 0
  const closed = won + (byStatus.LOST ?? 0)
  return {
    total: leads.length,
    byStatus,
    bySource: [...src].map(([source, v]) => ({ source, ...v })).sort((a, b) => b.total - a.total),
    byOwner: [...own].map(([owner, v]) => ({ owner, ...v })).sort((a, b) => b.total - a.total),
    winRate: closed ? won / closed : null,
    perDay: [...perDay].map(([day, count]) => ({ day, count })),
  }
}

/** Minimal RFC-4180 CSV parser (quoted cells, escaped quotes, CRLF/LF). Returns rows of cells. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i++
        } else quoted = false
      } else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      cell = ''
      if (row.some((x) => x.trim())) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim())) rows.push(row)
  return rows
}

const HEADER_MAP: Record<string, string> = {
  email: 'email', 'e-mail': 'email', 'email address': 'email',
  'first name': 'firstName', firstname: 'firstName', first: 'firstName',
  'last name': 'lastName', lastname: 'lastName', last: 'lastName',
  phone: 'phone', company: 'company', website: 'website', message: 'message',
  budget: 'budget', source: 'source', 'utm campaign': 'utmCampaign',
}

export interface ImportRow {
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  company?: string
  website?: string
  message?: string
  budget?: string
  source?: string
}

/** Turn parsed CSV (first row = headers) into lead rows; bad/duplicate-in-file rows reported in `errors`. */
export function csvToLeadRows(rows: string[][]): { leads: ImportRow[]; errors: { line: number; reason: string }[] } {
  const errors: { line: number; reason: string }[] = []
  if (rows.length === 0) return { leads: [], errors: [{ line: 1, reason: 'Empty file' }] }
  const cols = (rows[0] ?? []).map((h) => HEADER_MAP[h.trim().toLowerCase()])
  if (!cols.includes('email')) return { leads: [], errors: [{ line: 1, reason: 'No "email" column found' }] }
  const seen = new Set<string>()
  const leads: ImportRow[] = []
  rows.slice(1).forEach((r, idx) => {
    const line = idx + 2
    const o: Record<string, string> = {}
    cols.forEach((k, i) => {
      const v = r[i]?.trim()
      if (k && v) o[k] = v
    })
    const email = o.email?.toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return void errors.push({ line, reason: `Invalid email "${o.email ?? ''}"` })
    if (seen.has(email)) return void errors.push({ line, reason: `Duplicate of an earlier row (${email})` })
    seen.add(email)
    leads.push({ ...o, email })
  })
  return { leads, errors }
}

export interface DueSplit {
  overdue: CrmTask[]
  today: CrmTask[]
}

/** Open tasks that are past due, or due before the end of `now`'s UTC day. */
export function splitDue(tasks: CrmTask[], now: Date = new Date()): DueSplit {
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  const open = tasks.filter((t) => !t.done && t.dueAt)
  return {
    overdue: open.filter((t) => t.dueAt!.getTime() < now.getTime()),
    today: open.filter((t) => t.dueAt!.getTime() >= now.getTime() && t.dueAt!.getTime() < endOfDay.getTime()),
  }
}

const OPEN_STATUSES: readonly string[] = ['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'PROPOSAL_SENT']
const STAGE_POINTS: Record<string, number> = { NEW: 10, CONTACTED: 25, DEMO_SCHEDULED: 45, PROPOSAL_SENT: 60 }

/** Days since the last touch (activity or creation) before an open lead counts as stale. */
export const STALE_DAYS = 7

export interface ScoreInput {
  status: string
  email: string
  phone: string | null
  company: string | null
  website: string | null
  budget: string | null
  message: string | null
  dealValue: number | null
}

/** 0–100 heat score: pipeline stage plus how complete/qualified the contact is. Closed leads score 0. */
export function leadScore(l: ScoreInput): number {
  if (!OPEN_STATUSES.includes(l.status)) return 0
  let n = STAGE_POINTS[l.status] ?? 0
  if (l.phone) n += 8
  if (l.company) n += 8
  if (l.website) n += 4
  if (l.budget) n += 10
  if (l.message) n += 5
  if (l.dealValue && l.dealValue > 0) n += 10
  if (!/@(gmail|yahoo|hotmail|outlook|icloud)\./i.test(l.email)) n += 5
  return Math.min(100, n)
}

export function scoreLabel(score: number): 'Hot' | 'Warm' | 'Cold' {
  return score >= 65 ? 'Hot' : score >= 35 ? 'Warm' : 'Cold'
}

/** Whole days an open lead has gone untouched, or null if it is closed or touched within STALE_DAYS. */
export function staleDays(status: string, lastTouch: Date, now: Date = new Date(), threshold: number = STALE_DAYS): number | null {
  if (!OPEN_STATUSES.includes(status)) return null
  const d = Math.floor((now.getTime() - lastTouch.getTime()) / 864e5)
  return d >= threshold ? d : null
}

/** Prisma `where` for leads a user may see: admins all; others their own plus unassigned (matches the lead page). */
export function visibleLeadsWhere(role: string, userId: string): { OR?: ({ assignedToId: string } | { assignedToId: null })[] } {
  return role === 'ADMIN' ? {} : { OR: [{ assignedToId: userId }, { assignedToId: null }] }
}
