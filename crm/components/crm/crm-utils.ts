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

export interface CrmTask {
  id: string
  leadId: string
  title: string
  dueAt: Date | null
  assigneeId: string | null
  done: boolean
}

/** Tasks live in the activity log (`task.created` / `task.completed`); fold them into current state. */
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
      })
    } else if (l.action === 'task.completed') {
      const t = tasks.get(taskId)
      if (t) t.done = true
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
      if (!hay.includes(q)) return false
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
