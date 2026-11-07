import 'server-only'
import type { SessionUser } from './auth'
import { statusOf } from './commission'
import { buildReport } from '@/components/crm/crm-utils'
import { prisma } from './prisma'
import { localDateKey } from './time'

/**
 * The Analytics numbers: shared by the website's Analytics page and the iOS app. Salespeople only ever see their own;
 * admins can look at the whole team or just themselves (`scope = 'mine'`).
 */
export async function loadAnalytics(user: SessionUser, scope: string | undefined) {
  // Salespeople only ever see their own numbers; admins can switch between the whole team and just themselves.
  const mine = user.role === 'SALES' || (scope === 'mine' && user.role === 'ADMIN')
  const now = Date.now()
  const d30 = new Date(now - 30 * 864e5)
  const d60 = new Date(now - 60 * 864e5)
  const [allLeads, commissionRows, users, bookings, closeLogs, me] = await Promise.all([
    prisma.lead.findMany({ where: { ...(mine ? { assignedToId: user.id } : {}) }, select: { id: true, status: true, source: true, assignedToId: true, createdAt: true, quotedPrice: true, lostReason: true } }),
    // Commission on my own won deals. These columns are all a salesperson ever gets; no prices, no terms.
    prisma.lead.findMany({
      where: { status: 'WON', commissionTotal: { not: null }, ...(user.role === 'ADMIN' ? (mine ? { assignedToId: user.id } : {}) : { assignedToId: user.id }) },
      select: { commissionTotal: true, commissionSnapshot: true, finalPaymentReceivedAt: true, finalPaidAt: true, refundedAt: true, payments: { select: { commission: true, receivedAt: true, commissionPaidAt: true, refundedAt: true } } },
    }),
    prisma.user.findMany({ where: user.role === 'SALES' ? { id: user.id } : {}, select: { id: true, name: true, email: true } }),
    prisma.booking.findMany({ where: { endTime: { lt: new Date(now), gte: d60 }, leadId: { not: null }, ...(mine ? { hostId: user.id } : {}) }, select: { status: true, endTime: true } }),
    // When deals were actually won or lost (from the stage-change history, not "last edited").
    prisma.activityLog.findMany({
      where: { entityType: 'LEAD', action: 'lead.status_changed', OR: [{ metadata: { path: ['to'], equals: 'WON' } }, { metadata: { path: ['to'], equals: 'LOST' } }] },
      select: { entityId: true, createdAt: true, metadata: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } }),
  ])
  // Latest close event per lead (a deal reopened and won again counts at its latest win).
  const closedAt = new Map<string, { to: string; at: Date }>()
  for (const l of closeLogs) closedAt.set(l.entityId, { to: String((l.metadata as { to?: string } | null)?.to), at: l.createdAt })
  const leads = allLeads.map((l) => {
    const c = closedAt.get(l.id)
    const at = c && c.to === l.status ? c.at : null
    return { ...l, quotedPrice: user.role === 'ADMIN' ? l.quotedPrice : null, wonAt: l.status === 'WON' ? at : null, lostAt: l.status === 'LOST' ? at : null }
  })
  // Each metric for the window [from, to). Comparing two windows is fair: both measure what happened inside them.
  const window = (from: Date, to: Date): { added: number; won: number; winRate: number | null; kept: number | null } => {
    const inW = (d: Date | null): boolean => Boolean(d && d >= from && d < to)
    const wonL = leads.filter((l) => inW(l.wonAt))
    const lostL = leads.filter((l) => inW(l.lostAt))
    const bk = bookings.filter((b) => b.endTime >= from && b.endTime < to && b.status !== 'PENDING')
    return {
      added: leads.filter((l) => inW(l.createdAt)).reduce((n, l) => n + (l.quotedPrice ?? 0), 0),
      won: wonL.reduce((n, l) => n + (l.quotedPrice ?? 0), 0),
      winRate: wonL.length + lostL.length ? Math.round((wonL.length / (wonL.length + lostL.length)) * 100) : null,
      kept: bk.length ? Math.round((bk.filter((b) => b.status === 'CONFIRMED').length / bk.length) * 100) : null,
    }
  }
  const cur = window(d30, new Date(now + 1))
  const prev = window(d60, d30)
  const totalPipeline = leads.filter((l) => l.status !== 'WON' && l.status !== 'LOST').reduce((n, l) => n + (l.quotedPrice ?? 0), 0)
  const commission = commissionRows.reduce((t, r) => {
    const s = statusOf(r)
    return { total: t.total + s.total, paid: t.paid + s.paid, payable: t.payable + s.payable, pending: t.pending + s.pending }
  }, { total: 0, paid: 0, payable: 0, pending: 0 })
  const names = new Map(users.map((u) => [u.id, u.name ?? u.email ?? u.id]))
  const r = buildReport(leads, (id) => (id ? (names.get(id) ?? 'Unknown') : 'Unassigned'), new Date(now), 30, (d) => localDateKey(d, me.timeZone))
  const last30 = r.perDay.reduce((n, d) => n + d.count, 0)
  const lostReasons = [...leads.filter((l) => l.status === 'LOST').reduce((m, l) => m.set((l.lostReason ?? 'No reason').split(':')[0]!.trim(), (m.get((l.lostReason ?? 'No reason').split(':')[0]!.trim()) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1])
  return { mine, r, cur, prev, totalPipeline, commission, commissionDeals: commissionRows.length, last30, lostReasons }
}
