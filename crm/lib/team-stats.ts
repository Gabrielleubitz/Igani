import 'server-only'
import { prisma } from './prisma'
import { tasksForUser } from './tasks'
import { conversionRate, isOpenTask } from './team-metrics'

export interface RepStats {
  id: string
  name: string
  email: string
  timeZone: string
  active: boolean
  openLeads: number
  won: number
  lost: number
  wonValue: number
  wonValue30: number
  won30: number
  conversion: number | null
  openTasks: number
  overdueTasks: number
  upcomingMeetings: number
  lastActive: Date | null
}

/** One row per salesperson, for the leaderboard. Admins only; callers must have checked the role. */
export async function loadRepStats(adminForTasks: { id: string; role: string }): Promise<RepStats[]> {
  const since = new Date(Date.now() - 30 * 86_400_000)
  const now = new Date()
  const [users, allowed, leads, meetings, tasks, seen] = await Promise.all([
    prisma.user.findMany({ where: { role: 'SALES' }, select: { id: true, name: true, email: true, timeZone: true } }),
    prisma.allowedUser.findMany({ select: { email: true, active: true } }),
    prisma.lead.findMany({ where: { archived: false, assignedToId: { not: null } }, select: { assignedToId: true, status: true, dealValue: true, updatedAt: true } }),
    prisma.booking.groupBy({ by: ['hostId'], where: { status: 'CONFIRMED', startTime: { gt: now } }, _count: true }),
    tasksForUser(adminForTasks),
    prisma.activityLog.groupBy({ by: ['actorId'], where: { actorId: { not: null } }, _max: { createdAt: true } }),
  ])
  const active = new Map(allowed.map((a) => [a.email, a.active]))
  const meet = new Map(meetings.map((m) => [m.hostId, m._count]))
  const last = new Map(seen.map((s) => [s.actorId, s._max.createdAt]))
  return users.map((u) => {
    const mine = leads.filter((l) => l.assignedToId === u.id)
    const won = mine.filter((l) => l.status === 'WON')
    const lost = mine.filter((l) => l.status === 'LOST').length
    const won30 = won.filter((l) => l.updatedAt >= since)
    const open = tasks.all.filter((t) => isOpenTask(t, u.id, tasks.leads.get(t.leadId)?.assignedToId))
    return {
      id: u.id,
      name: u.name ?? u.email ?? 'Unnamed',
      email: u.email ?? '',
      timeZone: u.timeZone,
      active: active.get(u.email ?? '') ?? true,
      openLeads: mine.filter((l) => l.status !== 'WON' && l.status !== 'LOST').length,
      won: won.length,
      lost,
      wonValue: won.reduce((s, l) => s + (l.dealValue ?? 0), 0),
      won30: won30.length,
      wonValue30: won30.reduce((s, l) => s + (l.dealValue ?? 0), 0),
      conversion: conversionRate(won.length, lost),
      openTasks: open.length,
      overdueTasks: open.filter((t) => t.dueAt && t.dueAt < now).length,
      upcomingMeetings: meet.get(u.id) ?? 0,
      lastActive: last.get(u.id) ?? null,
    }
  })
}
