/**
 * Everything the Today page shows, gathered in one place (in parallel): the day's timeline, what needs the person,
 * the deals worth moving, calling momentum and recent activity. Salespeople see their own; admins see everyone's.
 */
import 'server-only'
import type { LeadStatus } from '@prisma/client'
import { leadScore, staleDays } from '@/components/crm/crm-utils'
import type { SessionUser } from '@/lib/auth'
import { bookingScope } from '@/lib/bookings'
import { asAnalysis } from '@/lib/call-analysis'
import { OPEN_PROSPECT } from '@/lib/call-lists'
import { salespersonCommissionView, statusOf } from '@/lib/commission'
import { leadName } from '@/lib/format'
import { notArchivedBy } from '@/lib/lead-archive'
import { leadScope } from '@/lib/lead-access'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'
import { tasksForUser } from '@/lib/tasks'
import { loadTeamTasks } from '@/lib/team-tasks'
import { endOfLocalDay, startOfLocalDay } from '@/lib/time'

const DAY = 864e5
export const OPEN_STAGES = ['NEW', 'NO_ANSWER', 'CALL_BACK', 'VOICEMAIL', 'BUSY', 'INTERESTED', 'CONTACTED', 'DEMO_SCHEDULED', 'DEMO_SENT', 'PROPOSAL_SENT', 'SIGNED'] as const

/** How far along a stage is, for the progress bar (Won = 100). */
export const STAGE_PROGRESS: Record<string, number> = { NEW: 8, NO_ANSWER: 10, CALL_BACK: 14, VOICEMAIL: 12, BUSY: 11, INTERESTED: 18, NOT_INTERESTED: 0, WRONG_NUMBER: 0, CONTACTED: 22, DEMO_SCHEDULED: 40, DEMO_SENT: 55, PROPOSAL_SENT: 72, SIGNED: 90, WON: 100, LOST: 0 }

export type AgendaItem = {
  id: string
  kind: 'meeting' | 'team' | 'task' | 'team-task'
  start: Date
  minutes: number | null
  title: string
  sub: string | null
  href: string | null
  meetUrl: string | null
  live: boolean
  /** lead task id for the "done" button */
  task?: { leadId: string; taskId: string }
}

export type ActionItem = {
  id: string
  tone: 'email' | 'reply' | 'offer' | 'task' | 'lead' | 'list'
  title: string
  sub: string
  href: string
  cta: string
  /** opens the dialer instead of a link */
  dialer?: 'lists'
  task?: { leadId: string; taskId: string }
  at: Date
}

export type DealRow = { id: string; name: string; company: string | null; status: LeadStatus; progress: number; touchedAt: Date; quietDays: number; health: 'good' | 'watch' | 'risk'; score: number }

export type ActivityRow = { id: string; action: string; leadId: string; leadName: string; at: Date; text: string }

export async function loadToday(user: SessionUser) {
  const now = new Date()
  const isAdmin = user.role === 'ADMIN'
  const seller = user.role !== 'MARKETING'
  const me = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true, name: true } })
  const tz = me.timeZone
  const dayStart = startOfLocalDay(now, tz)
  const dayEnd = endOfLocalDay(now, tz)
  const mineWhere = isAdmin ? {} : { assignedToId: user.id }
  const scope = await bookingScope(user)
  const myLeads = { ...notArchivedBy(user.id), ...mineWhere }

  const [threshold, meetings, openLeads, unclaimed, newThisWeek, waiting, offerVisits, lists, callsWeek, completions, activity, newEmails, wonThisMonth] = await Promise.all([
    getSetting('leads.staleDays'),
    seller
      ? prisma.booking.findMany({
          where: { status: 'CONFIRMED', endTime: { gte: dayStart }, startTime: { lt: dayEnd }, ...scope },
          orderBy: { startTime: 'asc' },
          take: 30,
          select: { id: true, title: true, guestName: true, startTime: true, endTime: true, leadId: true, meetUrl: true, source: true, attendees: true, meeting: { select: { status: true } }, lead: { select: { company: true } } },
        })
      : Promise.resolve([]),
    prisma.lead.findMany({ where: { ...myLeads, status: { in: [...OPEN_STAGES] } }, take: 1000 }),
    isAdmin ? prisma.lead.findMany({ where: { ...notArchivedBy(user.id), assignedToId: null, status: { in: [...OPEN_STAGES] } }, orderBy: { createdAt: 'desc' }, take: 3 }) : Promise.resolve([]),
    prisma.lead.count({ where: { AND: [leadScope(user), { ...notArchivedBy(user.id), createdAt: { gte: new Date(now.getTime() - 7 * DAY) } }] } }),
    // our emails still waiting for an answer
    prisma.emailMessage.findMany({
      where: { direction: 'OUTBOUND', repliedAt: null, externalId: { startsWith: 'resend:' }, sentAt: { gte: new Date(now.getTime() - 30 * DAY) }, ...(isAdmin ? {} : { mailboxUserId: user.id }), lead: { ...notArchivedBy(user.id) } },
      orderBy: { sentAt: 'asc' },
      take: 200,
      select: { id: true, subject: true, sentAt: true, followUpAt: true, lead: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true } } },
    }),
    // proposals opened in the last 2 days
    prisma.offerVisit.findMany({
      where: { startedAt: { gte: new Date(now.getTime() - 2 * DAY) }, offer: { lead: myLeads } },
      orderBy: { lastSeenAt: 'desc' },
      take: 300,
      select: { offerId: true, lastSeenAt: true, durationMs: true, maxScrollPct: true, offer: { select: { title: true, status: true, lead: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true } } } } },
    }),
    seller ? prisma.callList.findMany({ where: { ownerId: user.id }, select: { id: true, name: true, prospects: { where: { status: { in: OPEN_PROSPECT } }, select: { id: true } } }, orderBy: { updatedAt: 'desc' }, take: 20 }) : Promise.resolve([]),
    seller ? prisma.call.findMany({ where: { userId: user.id, simulated: false, private: false, startedAt: { gte: new Date(dayStart.getTime() - 6 * DAY) } }, select: { startedAt: true, status: true, durationSec: true, analysis: true } }) : Promise.resolve([]),
    prisma.activityLog.findMany({ where: { action: 'task.completed', actorId: user.id, createdAt: { gte: new Date(dayStart.getTime() - 13 * DAY) } }, select: { createdAt: true } }),
    prisma.activityLog.findMany({
      where: { entityType: 'LEAD', action: { in: ['lead.created', 'email.received', 'lead.status_changed', 'call.analyzed', 'lead.resubmitted', 'lead.assigned'] }, createdAt: { gte: new Date(now.getTime() - 7 * DAY) }, ...(isAdmin ? {} : { entityId: { in: (await prisma.lead.findMany({ where: { assignedToId: user.id }, select: { id: true }, take: 2000 })).map((l) => l.id) } }) },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: { id: true, action: true, entityId: true, createdAt: true, metadata: true, actorId: true },
    }),
    prisma.emailMessage.findMany({
      where: { direction: 'INBOUND', readAt: null, sentAt: { gte: new Date(now.getTime() - 30 * DAY) }, lead: { ...notArchivedBy(user.id), ...(isAdmin ? { OR: [{ assignedToId: user.id }, { assignedToId: null }] } : { assignedToId: user.id }) } },
      orderBy: { sentAt: 'desc' },
      take: 6,
      select: { id: true, subject: true, snippet: true, sentAt: true, lead: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true } } },
    }),
    prisma.lead.count({ where: { ...myLeads, status: 'WON', updatedAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } } }),
  ])

  // Tasks: mine on contacts + team tasks, due by tonight
  const { mine, leads: byId } = await tasksForUser(user)
  const due = mine.filter((t) => !t.done && t.dueAt && t.dueAt < dayEnd).sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime())
  const teamDue = (await loadTeamTasks(user.id)).filter((t) => !t.done && t.dueAt && t.dueAt < dayEnd)
  const overdue = due.filter((t) => t.dueAt! < dayStart)
  const overdueTeam = teamDue.filter((t) => t.dueAt! < dayStart)

  // ── Your day: meetings and today's tasks, in time order ──
  const agenda: AgendaItem[] = [
    ...meetings.map((b): AgendaItem => {
      const team = b.source === 'TEAM_MEETING'
      const people = team ? (Array.isArray(b.attendees) ? b.attendees.filter((a): a is string => typeof a === 'string').map((a) => a.split('@')[0]!).slice(0, 4).join(', ') : null) : [b.guestName, b.lead?.company].filter(Boolean).join(' · ')
      return { id: `b-${b.id}`, kind: team ? 'team' : 'meeting', start: b.startTime, minutes: Math.round((b.endTime.getTime() - b.startTime.getTime()) / 60000), title: b.title, sub: people || null, href: b.leadId ? `/sales/leads/${b.leadId}` : null, meetUrl: b.meetUrl, live: b.meeting?.status === 'LIVE' || (b.startTime <= now && b.endTime > now) }
    }),
    ...due
      .filter((t) => t.dueAt! >= dayStart)
      .map((t): AgendaItem => {
        const l = byId.get(t.leadId)
        return { id: `t-${t.id}`, kind: 'task', start: t.dueAt!, minutes: null, title: t.title, sub: l ? [leadName(l), l.company].filter(Boolean).join(' · ') : null, href: l ? `/sales/leads/${l.id}` : null, meetUrl: null, live: false, task: { leadId: t.leadId, taskId: t.id } }
      }),
    ...teamDue.filter((t) => t.dueAt! >= dayStart).map((t): AgendaItem => ({ id: `tt-${t.id}`, kind: 'team-task', start: t.dueAt!, minutes: null, title: t.title, sub: 'Team task', href: '/sales/tasks', meetUrl: null, live: false })),
  ].sort((a, b) => a.start.getTime() - b.start.getTime())

  // ── Deals: touch history → health ──
  const touches = await prisma.activityLog.groupBy({ by: ['entityId'], where: { entityType: 'LEAD', entityId: { in: openLeads.map((l) => l.id) }, actorId: { not: null } }, _max: { createdAt: true } })
  const lastTouch = new Map(touches.map((t) => [t.entityId, t._max.createdAt]))
  const deals: DealRow[] = openLeads.map((l) => {
    const touchedAt = lastTouch.get(l.id) ?? l.createdAt
    const quietDays = Math.floor((now.getTime() - touchedAt.getTime()) / DAY)
    const stale = staleDays(l.status, touchedAt, now, threshold)
    return {
      id: l.id,
      name: leadName(l),
      company: l.company,
      status: l.status,
      progress: STAGE_PROGRESS[l.status] ?? 0,
      touchedAt,
      quietDays,
      health: stale !== null ? (stale >= threshold * 2 ? 'risk' : 'watch') : 'good',
      score: leadScore(l),
    }
  })
  const needFollowUp = deals.filter((d) => d.health !== 'good').length
  const hot = deals.filter((d) => d.score >= 65).length
  // Worth moving: hottest first, but a hot deal going quiet beats a fresh cold one
  const dealsToMove = [...deals].sort((a, b) => b.score + (b.health === 'good' ? 0 : 15) - (a.score + (a.health === 'good' ? 0 : 15)) || b.quietDays - a.quietDays).slice(0, 7)

  // ── Needs you ──
  const actions: ActionItem[] = []
  for (const e of newEmails) actions.push({ id: `e-${e.id}`, tone: 'email', title: `Reply to ${leadName(e.lead)}`, sub: e.subject, href: `/sales/leads/${e.lead.id}#emails`, cta: 'Reply', at: e.sentAt })
  const byOffer = new Map<string, { visits: number; last: Date; ms: number; scroll: number; v: (typeof offerVisits)[number] }>()
  for (const v of offerVisits) {
    if (v.offer.status === 'SIGNED') continue
    const g = byOffer.get(v.offerId) ?? { visits: 0, last: v.lastSeenAt, ms: 0, scroll: 0, v }
    g.visits++
    g.ms += v.durationMs
    g.scroll = Math.max(g.scroll, v.maxScrollPct)
    if (v.lastSeenAt > g.last) g.last = v.lastSeenAt
    byOffer.set(v.offerId, g)
  }
  for (const [offerId, g] of byOffer) {
    const mins = Math.max(1, Math.round(g.ms / 60000))
    actions.push({ id: `o-${offerId}`, tone: 'offer', title: `${leadName(g.v.offer.lead)} is reading your proposal`, sub: `${g.visits} visit${g.visits === 1 ? '' : 's'} · ${mins} min · read ${g.scroll}% · in the last 2 days`, href: `/sales/leads/${g.v.offer.lead.id}`, cta: 'Call now', at: g.last })
  }
  const silent = waiting.filter((w) => w.followUpAt && w.followUpAt <= now)
  for (const w of silent.slice(0, 4)) {
    const days = Math.max(1, Math.floor((now.getTime() - w.sentAt.getTime()) / DAY))
    actions.push({ id: `w-${w.id}`, tone: 'reply', title: `Nudge ${leadName(w.lead)}`, sub: `No reply in ${days} day${days === 1 ? '' : 's'} · “${w.subject}”`, href: `/sales/leads/${w.lead.id}#emails`, cta: 'Follow up', at: w.followUpAt! })
  }
  for (const t of overdue.slice(0, 4)) {
    const l = byId.get(t.leadId)
    actions.push({ id: `t-${t.id}`, tone: 'task', title: t.title, sub: `Overdue${l ? ` · ${leadName(l)}` : ''}`, href: l ? `/sales/leads/${l.id}` : '/sales/tasks', cta: 'Done', task: { leadId: t.leadId, taskId: t.id }, at: t.dueAt! })
  }
  for (const l of unclaimed) actions.push({ id: `u-${l.id}`, tone: 'lead', title: `New lead: ${leadName(l)}`, sub: `${l.company ?? l.email ?? l.phone ?? ''} · waiting for an owner`, href: `/sales/leads/${l.id}`, cta: 'Assign', at: l.createdAt })
  const toCall = lists.reduce((n, l) => n + l.prospects.length, 0)
  const busiest = [...lists].sort((a, b) => b.prospects.length - a.prospects.length)[0]
  if (toCall && busiest) actions.push({ id: 'list', tone: 'list', title: `${toCall} business${toCall === 1 ? '' : 'es'} to call`, sub: lists.filter((l) => l.prospects.length).length > 1 ? `Across ${lists.filter((l) => l.prospects.length).length} call lists` : `On “${busiest.name}”`, href: `/sales/call-lists/${busiest.id}`, cta: 'Start calling', dialer: 'lists', at: now })
  const order: ActionItem['tone'][] = ['offer', 'email', 'reply', 'task', 'lead', 'list']
  actions.sort((a, b) => order.indexOf(a.tone) - order.indexOf(b.tone) || b.at.getTime() - a.at.getTime())

  // ── Calls: last 7 days, per day ──
  const dayKey = (d: Date): string => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  const days7 = Array.from({ length: 7 }, (_, i) => new Date(dayStart.getTime() - (6 - i) * DAY + 12 * 3600_000))
  const perDay = days7.map((d) => ({ label: new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'narrow' }).format(d), key: dayKey(d), calls: 0, connected: 0 }))
  let talkSec = 0
  const scores: number[] = []
  for (const c of callsWeek) {
    const slot = perDay.find((p) => p.key === dayKey(c.startedAt))
    if (!slot) continue
    slot.calls++
    if (c.status === 'COMPLETED' && (c.durationSec ?? 0) > 0) slot.connected++
    talkSec += c.durationSec ?? 0
    const a = asAnalysis(c.analysis)
    if (a?.isSalesCall) scores.push(a.outcome.score)
  }
  const todayCalls = perDay[6]!

  // ── Tasks done per day (2 weeks), for the sparkline ──
  const days14 = Array.from({ length: 14 }, (_, i) => dayKey(new Date(dayStart.getTime() - (13 - i) * DAY + 12 * 3600_000)))
  const doneCounts = new Map<string, number>()
  for (const c of completions) doneCounts.set(dayKey(c.createdAt), (doneCounts.get(dayKey(c.createdAt)) ?? 0) + 1)
  const doneSpark = days14.map((k) => doneCounts.get(k) ?? 0)

  // ── Money ──
  const pipelineValue = isAdmin ? openLeads.reduce((n, l) => n + (l.quotedPrice ?? 0), 0) : 0
  const proposals = openLeads.filter((l) => l.status === 'PROPOSAL_SENT' || l.status === 'SIGNED').length
  const commissionRows = isAdmin || !seller ? [] : await prisma.lead.findMany({ where: { status: 'WON', assignedToId: user.id, commissionTotal: { not: null } }, select: { commissionTotal: true, commissionSnapshot: true, finalPaymentReceivedAt: true, finalPaidAt: true, refundedAt: true, payments: { select: { commission: true, receivedAt: true, commissionPaidAt: true, refundedAt: true } } } })
  const commission = salespersonCommissionView(
    commissionRows.reduce(
      (t, r) => {
        const s = statusOf(r)
        return { total: t.total + s.total, paid: t.paid + s.paid, payable: t.payable + s.payable, pending: t.pending + s.pending }
      },
      { total: 0, paid: 0, payable: 0, pending: 0 },
    ),
  )

  // ── Recent activity on my contacts ──
  const leadNames = new Map((await prisma.lead.findMany({ where: { id: { in: [...new Set(activity.map((a) => a.entityId))] } }, select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true } })).map((l) => [l.id, leadName(l)]))
  const recent: ActivityRow[] = activity
    .filter((a) => leadNames.has(a.entityId) && !(a.action === 'lead.assigned' && a.actorId === user.id))
    .slice(0, 6)
    .map((a) => {
      const m = (a.metadata ?? {}) as Record<string, unknown>
      const text =
        a.action === 'lead.created'
          ? `New lead${typeof m.source === 'string' ? ` from ${m.source}` : ''}`
          : a.action === 'email.received'
            ? `Emailed: ${String(m.subject ?? '')}`
            : a.action === 'lead.status_changed'
              ? `Moved to ${String(m.to ?? '').replace(/_/g, ' ').toLowerCase()}`
              : a.action === 'call.analyzed'
                ? `Call reviewed${typeof m.outcome === 'string' ? `: ${m.outcome}` : ''}`
                : a.action === 'lead.resubmitted'
                  ? 'Reached out again'
                  : 'Assigned'
      return { id: a.id, action: a.action, leadId: a.entityId, leadName: leadNames.get(a.entityId)!, at: a.createdAt, text }
    })

  const meetingsToday = agenda.filter((a) => a.kind === 'meeting' || a.kind === 'team').length
  return {
    now,
    tz,
    firstName: me.name?.split(' ')[0] ?? null,
    isAdmin,
    seller,
    agenda,
    meetingsToday,
    actions: actions.slice(0, 7),
    actionsTotal: actions.length,
    kpis: {
      openDeals: openLeads.length,
      newThisWeek,
      needFollowUp,
      hot,
      pipelineValue,
      proposals,
      wonThisMonth,
      commissionPending: commission.pending,
      waiting: waiting.length,
      silent: silent.length,
      oldestWaitDays: waiting[0] ? Math.floor((now.getTime() - waiting[0].sentAt.getTime()) / DAY) : 0,
      tasksToday: due.length + teamDue.length,
      tasksOverdue: overdue.length + overdueTeam.length,
      doneSpark,
    },
    deals: dealsToMove,
    calls: { perDay, today: todayCalls, week: perDay.reduce((n, d) => n + d.calls, 0), connected: perDay.reduce((n, d) => n + d.connected, 0), talkMin: Math.round(talkSec / 60), avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null, toCall },
    recent,
    threshold,
  }
}

export type TodayData = Awaited<ReturnType<typeof loadToday>>
