import 'server-only'
import { leadName } from './format'
import { loadMeetingTasks } from './meeting-tasks'
import { prisma } from './prisma'
import { taskOwner, tasksForUser } from './tasks'

const DAY = 86_400_000

export interface WeeklySummary {
  from: Date
  to: Date
  newLeads: number
  newLeadsPrev: number
  topSources: { source: string; count: number }[]
  won: { count: number; value: number }
  signedOffers: { title: string; client: string; total: number; currency: string }[]
  meetingsHeld: number
  pipelineValue: number
  openDeals: number
  /** Teammates with open or overdue tasks, most overdue first */
  tasks: { name: string; open: number; overdue: number }[]
  /** Live offers the client looked at this week but has not signed: the ones to call */
  hotOffers: { id: string; title: string; client: string; visits: number; people: number; avgRead: number; lastVisit: Date }[]
  /** Deals nobody touched for `staleDays` */
  quiet: number
}

/** Everything in the Sunday email, for the 7 days before `now`. Read-only. */
export async function buildWeeklySummary(now = new Date(), staleDays = 7): Promise<WeeklySummary> {
  const from = new Date(now.getTime() - 7 * DAY)
  const prevFrom = new Date(now.getTime() - 14 * DAY)
  const stale = new Date(now.getTime() - staleDays * DAY)
  const [newLeads, newLeadsPrev, sources, wonLogs, signed, meetingsHeld, pipeline, quiet, visits, reps] = await Promise.all([
    prisma.lead.count({ where: { createdAt: { gte: from, lt: now } } }),
    prisma.lead.count({ where: { createdAt: { gte: prevFrom, lt: from } } }),
    prisma.lead.groupBy({ by: ['source'], where: { createdAt: { gte: from, lt: now } }, _count: { _all: true } }),
    prisma.activityLog.findMany({ where: { entityType: 'LEAD', action: 'lead.status_changed', createdAt: { gte: from, lt: now }, metadata: { path: ['to'], equals: 'WON' } }, select: { entityId: true } }),
    prisma.offer.findMany({ where: { signedAt: { gte: from, lt: now } }, select: { title: true, signedTotal: true, currency: true, lead: { select: { firstName: true, lastName: true, email: true, company: true } } }, orderBy: { signedAt: 'desc' } }),
    prisma.booking.count({ where: { status: 'CONFIRMED', endTime: { gte: from, lt: now } } }),
    prisma.lead.aggregate({ where: { status: { notIn: ['WON', 'LOST'] } }, _sum: { quotedPrice: true }, _count: { _all: true } }),
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*)::bigint AS n FROM "Lead" l
      WHERE l.status NOT IN ('WON','LOST')
        AND COALESCE((SELECT max(a."createdAt") FROM "ActivityLog" a WHERE a."entityType" = 'LEAD' AND a."entityId" = l.id AND a."actorId" IS NOT NULL), l."createdAt") < ${stale}`.then((r) => Number(r[0]?.n ?? 0)),
    prisma.offerVisit.findMany({ where: { startedAt: { gte: from, lt: now }, offer: { status: 'LIVE' } }, select: { offerId: true, visitorId: true, maxScrollPct: true, startedAt: true } }),
    prisma.user.findMany({ where: { role: { not: null } }, select: { id: true, name: true, email: true } }),
  ])

  const wonIds = [...new Set(wonLogs.map((l) => l.entityId))]
  const wonLeads = wonIds.length ? await prisma.lead.findMany({ where: { id: { in: wonIds }, status: 'WON' }, select: { quotedPrice: true } }) : []

  // Tasks per teammate (same counting as the Overview page)
  const [{ all: leadTasks, leads: taskLeads }, meetingTasks] = await Promise.all([tasksForUser({ id: '', role: 'ADMIN' }), loadMeetingTasks(undefined, { includeTeam: true })])
  const per = new Map<string, { open: number; overdue: number }>()
  const bump = (id: string, overdue: boolean): void => {
    const e = per.get(id) ?? { open: 0, overdue: 0 }
    per.set(id, { open: e.open + 1, overdue: e.overdue + (overdue ? 1 : 0) })
  }
  for (const t of leadTasks) if (!t.done) bump(taskOwner(t, taskLeads.get(t.leadId)?.assignedToId) ?? 'none', Boolean(t.dueAt && t.dueAt < now))
  for (const t of meetingTasks) if (!t.done) bump(t.assigneeId ?? t.leadId ?? 'none', Boolean(t.dueAt && t.dueAt < now))
  const nameOf = new Map(reps.map((r) => [r.id, r.name ?? r.email ?? 'Teammate']))
  const tasks = [...per.entries()]
    .map(([id, v]) => ({ name: id === 'none' ? 'Unassigned' : (nameOf.get(id) ?? 'Former teammate'), ...v }))
    .sort((a, b) => b.overdue - a.overdue || b.open - a.open)
    .slice(0, 10)

  // Offers clients looked at this week
  const byOffer = new Map<string, { visits: number; people: Set<string>; read: number; last: Date }>()
  for (const v of visits) {
    const e = byOffer.get(v.offerId) ?? { visits: 0, people: new Set<string>(), read: 0, last: v.startedAt }
    e.visits++
    e.people.add(v.visitorId)
    e.read += v.maxScrollPct
    if (v.startedAt > e.last) e.last = v.startedAt
    byOffer.set(v.offerId, e)
  }
  const offers = byOffer.size ? await prisma.offer.findMany({ where: { id: { in: [...byOffer.keys()] } }, select: { id: true, title: true, lead: { select: { firstName: true, lastName: true, email: true, company: true } } } }) : []
  const hotOffers = offers
    .map((o) => {
      const e = byOffer.get(o.id)!
      return { id: o.id, title: o.title, client: o.lead.company || leadName(o.lead), visits: e.visits, people: e.people.size, avgRead: Math.round(e.read / e.visits), lastVisit: e.last }
    })
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 8)

  return {
    from,
    to: now,
    newLeads,
    newLeadsPrev,
    topSources: sources.map((s) => ({ source: s.source, count: s._count._all })).sort((a, b) => b.count - a.count).slice(0, 4),
    won: { count: wonLeads.length, value: wonLeads.reduce((n, l) => n + (l.quotedPrice ?? 0), 0) },
    signedOffers: signed.map((o) => ({ title: o.title, client: o.lead.company || leadName(o.lead), total: o.signedTotal ?? 0, currency: o.currency })),
    meetingsHeld,
    pipelineValue: pipeline._sum.quotedPrice ?? 0,
    openDeals: pipeline._count._all,
    tasks,
    hotOffers,
    quiet,
  }
}

/** ISO week id (e.g. 2026-W45) used so the email goes out once per week even if the job runs twice. */
export function weekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const year = t.getUTCFullYear()
  const week = Math.ceil(((t.getTime() - Date.UTC(year, 0, 1)) / DAY + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}
