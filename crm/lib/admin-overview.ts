import 'server-only'
import { statusOf } from './commission'
import { loadMeetingTasks } from './meeting-tasks'
import { loadPayoutRows } from './payout-data'
import { prisma } from './prisma'
import { getSetting } from './settings'
import { taskOwner, tasksForUser } from './tasks'

/** The admin Overview's numbers: shared by the website and the iOS app. Admins only (the caller checks). */
export async function loadOverview() {
  const staleDays = await getSetting('leads.staleDays')
  const now = new Date()
  const stale = new Date(now.getTime() - staleDays * 86_400_000)
  const dayEnd = new Date(now.getTime() + 86_400_000)
  const open = { status: { notIn: ['WON', 'LOST'] as ('WON' | 'LOST')[] } }
  const [total, won, lost, unassigned, staleCount, newWeek, today, pendingApprovals, wonValue, openValue, commissionRows, recentLeads, reps] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: 'WON' } }),
    prisma.lead.count({ where: { status: 'LOST' } }),
    prisma.lead.count({ where: { ...open, assignedToId: null } }),
    // "Quiet" = no note/call/email/stage change by a teammate for N days: the same rule as Today's "Needs follow-up".
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*)::bigint AS n FROM "Lead" l
      WHERE l.status NOT IN ('WON', 'LOST')
        AND COALESCE((SELECT max(a."createdAt") FROM "ActivityLog" a WHERE a."entityType" = 'LEAD' AND a."entityId" = l.id AND a."actorId" IS NOT NULL), l."createdAt") < ${stale}`.then((r) => Number(r[0]?.n ?? 0)),
    prisma.lead.count({ where: { createdAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } } }),
    prisma.booking.count({ where: { status: 'CONFIRMED', source: { not: 'TEAM_MEETING' }, endTime: { gte: now }, startTime: { lt: dayEnd } } }),
    prisma.booking.count({ where: { status: 'PENDING', source: 'PUBLIC_PAGE', startTime: { gt: now } } }),
    // Company revenue = the quoted price of won deals. Pipeline = the quoted price of open deals that have one.
    prisma.lead.aggregate({ where: { status: 'WON' }, _sum: { quotedPrice: true } }),
    prisma.lead.aggregate({ where: open, _sum: { quotedPrice: true } }),
    prisma.lead.findMany({
      where: { status: 'WON', commissionTotal: { not: null } },
      select: { id: true, firstName: true, lastName: true, email: true, company: true, commissionTotal: true, commissionSnapshot: true, finalPaymentReceivedAt: true, finalPaidAt: true, refundedAt: true, payments: { select: { commission: true, receivedAt: true, commissionPaidAt: true, refundedAt: true } }, assignedTo: { select: { name: true, email: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 6, include: { assignedTo: { select: { name: true, email: true } } } }),
    prisma.user.findMany({
      where: { role: { in: ['SALES', 'ADMIN'] } },
      select: { id: true, name: true, email: true, assignedLeads: { select: { status: true, quotedPrice: true } } },
    }),
  ])
  const closed = won + lost
  const [{ all: leadTasks, leads: taskLeads }, meetingTasks] = await Promise.all([tasksForUser({ id: '', role: 'ADMIN' }), loadMeetingTasks()])
  const byPerson = new Map<string, { lead: number; overdue: number; meeting: typeof meetingTasks }>()
  const slot = (id: string): { lead: number; overdue: number; meeting: typeof meetingTasks } => byPerson.get(id) ?? byPerson.set(id, { lead: 0, overdue: 0, meeting: [] }).get(id)!
  for (const t of leadTasks.filter((x) => !x.done)) {
    const o = taskOwner(t, taskLeads.get(t.leadId)?.assignedToId) ?? 'none'
    const e = slot(o)
    e.lead++
    if (t.dueAt && t.dueAt < now) e.overdue++
  }
  for (const t of meetingTasks.filter((x) => !x.done)) slot(t.assigneeId ?? 'none').meeting.push(t)
  const nameById = new Map(reps.map((r) => [r.id, r.name ?? r.email ?? 'Teammate']))
  const openTasks = [...byPerson.entries()]
    .map(([id, v]) => ({ id, name: id === 'none' ? 'Unassigned' : (nameById.get(id) ?? 'Former teammate'), ...v, total: v.lead + v.meeting.length }))
    .sort((a, b) => b.total - a.total)
  // Commissions that can be paid out now: one row per client payment (and the bonus once the price is fully paid)
  const payableRows = (await loadPayoutRows()).filter((r) => !r.paidAt && !r.refundedAt).sort((a, b) => (a.receivedAt?.getTime() ?? 0) - (b.receivedAt?.getTime() ?? 0))
  const owed = commissionRows.reduce((t, r) => {
    const s = statusOf(r)
    return { total: t.total + s.total, paid: t.paid + s.paid, payable: t.payable + s.payable, pending: t.pending + s.pending }
  }, { total: 0, paid: 0, payable: 0, pending: 0 })
  const board = reps
    .map((r) => ({
      name: r.name ?? r.email ?? 'Teammate',
      open: r.assignedLeads.filter((l) => l.status !== 'WON' && l.status !== 'LOST').length,
      won: r.assignedLeads.filter((l) => l.status === 'WON').length,
      value: r.assignedLeads.filter((l) => l.status === 'WON').reduce((n, l) => n + (l.quotedPrice ?? 0), 0),
    }))
    .sort((a, b) => b.value - a.value || b.won - a.won)

  return { staleDays, total, won, lost, unassigned, staleCount, newWeek, today, pendingApprovals, wonValue: wonValue._sum.quotedPrice ?? 0, openValue: openValue._sum.quotedPrice ?? 0, closed, openTasks, payableRows, owed, recentLeads, board }
}
