import { loadOverview } from '@/lib/admin-overview'
import { avatarPath } from '@/lib/avatar'
import { CALL_STATUS_LABEL } from '@/lib/call-ui'
import { appUrl } from '@/lib/env'
import { leadName } from '@/lib/format'
import { fail, json, mobileUser } from '@/lib/mobile'
import { loadSiteInsights } from '@/lib/offer-insights'
import { loadPayoutRows } from '@/lib/payout-data'
import { groupPayouts } from '@/lib/payouts'
import { formatPhone } from '@/lib/phone-numbers'
import { prisma } from '@/lib/prisma'
import { listPendingLinks } from '@/lib/sales-contract'
import { CONTRACT_VERSION } from '@/lib/sales-contract-core'
import { getSettings } from '@/lib/settings'
import { SITE_PAGES, isSitePage } from '@/lib/site-pages'
import { rankReps } from '@/lib/team-metrics'
import { loadRepStats } from '@/lib/team-stats'
import { dialerDemo, listTwilioNumbers, twilioConfig } from '@/lib/twilio'
import { listVideos } from '@/lib/video'
import { courseOrder } from '@/lib/video-core'
import { allProgress } from '@/lib/video-progress'

export const dynamic = 'force-dynamic'

type User = Exclude<Awaited<ReturnType<typeof mobileUser>>, Response>
type Params = URLSearchParams

/** The admin pages for the app, one section at a time. Admins only; every change goes through the website's own actions. */
const SECTIONS: Record<string, (user: User, sp: Params) => Promise<unknown>> = {
  async overview() {
    const o = await loadOverview()
    return {
      staleDays: o.staleDays,
      open: o.total - o.won - o.lost,
      pipeline: o.openValue,
      leads: o.total,
      newWeek: o.newWeek,
      unassigned: o.unassigned,
      quiet: o.staleCount,
      won: o.won,
      revenue: o.wonValue,
      winRate: o.closed ? Math.round((o.won / o.closed) * 100) : null,
      meetings24h: o.today,
      approvals: o.pendingApprovals,
      owed: o.owed,
      payable: o.payableRows.slice(0, 40).map((r) => ({ leadId: r.leadId, paymentId: r.paymentId, label: r.label, lead: r.lead, salesperson: r.salesperson, amount: r.amount, receivedAt: r.receivedAt })),
      tasks: o.openTasks.map((p) => ({ id: p.id, name: p.name, lead: p.lead, overdue: p.overdue, meeting: p.meeting.length, total: p.total })),
      board: o.board,
      recent: o.recentLeads.map((l) => ({ id: l.id, name: leadName(l), company: l.company, owner: l.assignedTo ? (l.assignedTo.name ?? l.assignedTo.email) : null, at: l.createdAt, status: l.status })),
      cronOff: !process.env.CRON_SECRET,
    }
  },

  async payouts() {
    const { months, clawbacks } = groupPayouts(await loadPayoutRows())
    const row = (r: (typeof months)[number]['rows'][number]) => ({ leadId: r.leadId, paymentId: r.paymentId, label: r.label, lead: r.lead, salesperson: r.salesperson, amount: r.amount, receivedAt: r.receivedAt, refundedAt: r.refundedAt })
    return {
      months: months.map((m) => ({ month: m.month, total: m.total, dueDate: m.dueDate, rows: m.rows.map(row) })),
      clawbacks: clawbacks.map((c) => ({ ...row(c.row), withinWindow: c.withinWindow })),
    }
  },

  async bookings(_u, sp) {
    const filter = ['upcoming', 'CONFIRMED', 'PENDING', 'CANCELLED'].includes(sp.get('filter') ?? '') ? sp.get('filter')! : 'all'
    const now = new Date()
    const [pending, list] = await Promise.all([
      prisma.booking.findMany({ where: { status: 'PENDING', source: 'PUBLIC_PAGE', startTime: { gt: now } }, orderBy: { startTime: 'asc' }, include: { host: { select: { name: true, email: true } } } }),
      prisma.booking.findMany({
        where: filter === 'upcoming' ? { status: { in: ['PENDING', 'CONFIRMED'] }, endTime: { gte: now }, source: { not: 'TEAM_MEETING' } } : filter === 'all' ? { source: { not: 'TEAM_MEETING' } } : { status: filter as 'CONFIRMED' | 'PENDING' | 'CANCELLED', source: { not: 'TEAM_MEETING' } },
        orderBy: filter === 'upcoming' ? { startTime: 'asc' } : { createdAt: 'desc' },
        take: 100,
        include: { host: { select: { name: true, email: true } } },
      }),
    ])
    const b = (x: (typeof list)[number]) => ({ id: x.id, title: x.title, guest: x.guestName, email: x.guestEmail, start: x.startTime, end: x.endTime, status: x.status, source: x.source, host: x.host.name ?? x.host.email, meetUrl: x.meetUrl, leadId: x.leadId, done: Boolean((x as { completedAt?: Date | null }).completedAt) })
    return { filter, pending: pending.map(b), bookings: list.map(b) }
  },

  async 'booking-pages'() {
    const [pages, hosts] = await Promise.all([
      prisma.bookingPage.findMany({ orderBy: { createdAt: 'asc' }, include: { host: { select: { name: true, email: true } }, _count: { select: { bookings: true } } } }),
      prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SALES'] } }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }),
    ])
    return {
      hosts: hosts.map((h) => ({ id: h.id, name: h.name ?? h.email ?? h.id })),
      pages: pages.map((p) => ({ id: p.id, slug: p.slug, title: p.title, description: p.description, durationMinutes: p.durationMinutes, requiresApproval: p.requiresApproval, active: p.active, hostId: p.hostId, host: p.host.name ?? p.host.email, bookings: p._count.bookings, url: appUrl(`/book/${p.slug}`) })),
    }
  },

  async 'team-meetings'() {
    const now = new Date()
    const rows = await prisma.booking.findMany({
      where: { source: { in: ['TEAM_MEETING', 'SALES_INVITE'] }, leadId: null, startTime: { gte: new Date(now.getTime() - 14 * 86_400_000) } },
      orderBy: { startTime: 'desc' },
      take: 60,
      include: { host: { select: { name: true, email: true } } },
    })
    return { meetings: rows.map((x) => ({ id: x.id, title: x.title, guest: x.guestName, email: x.guestEmail, start: x.startTime, end: x.endTime, status: x.status, source: x.source, host: x.host.name ?? x.host.email, meetUrl: x.meetUrl, leadId: x.leadId, done: false })) }
  },

  async videos() {
    const [videos, progress, reps] = await Promise.all([listVideos(), allProgress(), prisma.user.findMany({ where: { role: 'SALES' }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } })])
    const course = courseOrder(videos)
    const team = course.filter((v) => v.visibility === 'team')
    return {
      videos: course.map((v) => ({ id: v.id, title: v.title, visibility: v.visibility, offerId: v.offerId, createdAt: v.createdAt, stream: appUrl(`/api/public/videos/${v.id}/stream`) })),
      progress: reps.map((r) => {
        const done = new Set(progress.get(r.id)?.completed ?? [])
        return { id: r.id, name: r.name ?? r.email ?? 'Salesperson', done: team.filter((v) => done.has(v.id)).length, total: team.length }
      }),
    }
  },

  async website(_u, sp) {
    const page = sp.get('page') && isSitePage(sp.get('page')!) ? (sp.get('page') as keyof typeof SITE_PAGES) : 'home'
    const days = [7, 30, 90].find((d) => String(d) === sp.get('days')) ?? 30
    const [data, settings] = await Promise.all([loadSiteInsights(page, days), getSettings()])
    const s = data.stats
    return {
      page,
      days,
      pages: Object.entries(SITE_PAGES).map(([key, v]) => ({ key, label: v.label, url: `${v.base}${v.path}` })),
      tracking: settings['website.tracking'][page],
      stats: { visits: s.visits, visitors: s.visitors, returning: s.returning, avgSeconds: s.avgSeconds, avgScroll: s.avgScroll, reach: s.reach, sections: s.sections, topClicks: s.topClicks.slice(0, 10), devices: Object.entries(s.devices).map(([name, count]) => ({ name, count })), lastVisit: s.lastVisit },
      recent: data.recent.slice(0, 25),
    }
  },

  async phone() {
    const config = twilioConfig()
    let numbers: { sid: string; number: string; display: string; name: string }[] = []
    let numbersError: string | null = null
    if (config) {
      try {
        numbers = (await listTwilioNumbers(config)).filter((n) => n.voice).map((n) => ({ sid: n.sid, number: n.number, display: formatPhone(n.number), name: n.name }))
      } catch (err) {
        numbersError = err instanceof Error ? err.message.slice(0, 200) : 'Could not read numbers from Twilio.'
      }
    }
    const [team, lines, settings, calls] = await Promise.all([
      prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SALES'] } }, select: { id: true, name: true, email: true, role: true }, orderBy: { name: 'asc' } }),
      prisma.phoneLine.findMany({ select: { userId: true, number: true, active: true } }),
      getSettings(),
      prisma.call.findMany({ where: { private: false }, orderBy: { startedAt: 'desc' }, take: 25, include: { user: { select: { name: true, email: true } }, lead: { select: { id: true, firstName: true, lastName: true, email: true } } } }),
    ])
    const lineOf = new Map(lines.map((l) => [l.userId, l]))
    return {
      ready: Boolean(config),
      demo: dialerDemo(),
      numbersError,
      numbers,
      record: settings['voice.record'],
      hints: settings['voice.hints'],
      listenIn: settings['voice.listenIn'],
      countries: settings['voice.countries'],
      team: team.map((u) => {
        const l = lineOf.get(u.id)
        return { id: u.id, name: u.name ?? u.email ?? 'Teammate', role: u.role, line: l ? { number: l.number, display: formatPhone(l.number), active: l.active } : null }
      }),
      calls: calls.map((c) => ({ id: c.id, by: c.user?.name ?? c.user?.email ?? null, lead: c.lead ? leadName(c.lead) : null, leadId: c.lead?.id ?? null, number: formatPhone(c.direction === 'INBOUND' ? c.fromNumber : c.toNumber), direction: c.direction, status: CALL_STATUS_LABEL[c.status] ?? c.status, startedAt: c.startedAt, durationSec: c.durationSec })),
    }
  },

  async team(user) {
    const reps = rankReps(await loadRepStats(user))
    return { reps: reps.map((r) => ({ id: r.id, name: r.name, email: r.email, active: r.active, openLeads: r.openLeads, won: r.won, lost: r.lost, wonValue: r.wonValue, won30: r.won30, wonValue30: r.wonValue30, conversion: r.conversion, openTasks: r.openTasks, overdueTasks: r.overdueTasks, upcomingMeetings: r.upcomingMeetings, lastActive: r.lastActive, page: appUrl(`/admin/team/${r.id}`) })) }
  },

  async users() {
    const [allowed, users] = await Promise.all([
      prisma.allowedUser.findMany({ orderBy: [{ active: 'desc' }, { email: 'asc' }] }),
      prisma.user.findMany({ select: { id: true, email: true, name: true, image: true, timeZone: true, accounts: { select: { refresh_token: true } }, _count: { select: { assignedLeads: { where: { status: { notIn: ['WON', 'LOST'] } } } } } } }),
    ])
    const lastSeen = await prisma.activityLog.groupBy({ by: ['actorId'], where: { actorId: { in: users.map((u) => u.id) } }, _max: { createdAt: true } })
    const seen = new Map(lastSeen.map((s) => [s.actorId, s._max.createdAt]))
    const byEmail = new Map(users.map((u) => [u.email, u]))
    return {
      people: allowed.map((a) => {
        const u = byEmail.get(a.email)
        const photo = u ? avatarPath(u) : null
        return { email: a.email, role: a.role, active: a.active, timeZone: u?.timeZone ?? (a as { timeZone?: string }).timeZone ?? null, userId: u?.id ?? null, name: u?.name ?? null, avatar: photo ? appUrl(photo) : null, signedUp: Boolean(u), calendar: Boolean(u?.accounts.some((x) => x.refresh_token)), openLeads: u?._count.assignedLeads ?? 0, lastSeen: u ? (seen.get(u.id) ?? null) : null }
      }),
    }
  },

  async audit(_u, sp) {
    const page = Math.max(1, Number.parseInt(sp.get('page') ?? '1', 10) || 1)
    const q = sp.get('q')?.trim().slice(0, 60)
    const type = sp.get('type') ?? ''
    const where = { ...(type ? { entityType: type as never } : {}), ...(q ? { action: { contains: q, mode: 'insensitive' as const } } : {}) }
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50, skip: (page - 1) * 50, include: { actor: { select: { name: true, email: true } } } }),
      prisma.activityLog.count({ where }),
    ])
    const leads = await prisma.lead.findMany({ where: { id: { in: logs.filter((l) => l.entityType === 'LEAD').map((l) => l.entityId) } }, select: { id: true, email: true, firstName: true, lastName: true, company: true } })
    const names = new Map(leads.map((l) => [l.id, leadName(l)]))
    const summarize = (meta: unknown): string =>
      meta && typeof meta === 'object'
        ? Object.entries(meta as Record<string, unknown>)
            .filter(([k]) => !['taskId', 'emailId', 'googleEventId'].includes(k))
            .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
            .join(' · ')
            .slice(0, 300)
        : ''
    return {
      page,
      more: page * 50 < total,
      total,
      logs: logs.map((l) => ({ id: l.id, at: l.createdAt, type: l.entityType, action: l.action, actor: l.actor ? (l.actor.name ?? l.actor.email) : 'System', entityId: l.entityId, lead: l.entityType === 'LEAD' ? (names.get(l.entityId) ?? null) : null, details: summarize(l.metadata) })),
    }
  },

  async settings() {
    const s = await getSettings()
    return {
      values: {
        'roundRobin.enabled': s['roundRobin.enabled'],
        'leads.defaultOwnerEmail': s['leads.defaultOwnerEmail'],
        'notifications.emails': s['notifications.emails'],
        'booking.defaultDurationMinutes': s['booking.defaultDurationMinutes'],
        'booking.bufferMinutes': s['booking.bufferMinutes'],
        'brand.name': s['brand.name'],
        'brand.supportEmail': s['brand.supportEmail'],
        'leads.staleDays': s['leads.staleDays'],
        'notifications.newLead': s['notifications.newLead'],
        'reminders.meetingEmails': s['reminders.meetingEmails'],
        'notifications.weeklySummary': s['notifications.weeklySummary'],
        'followUps.enabled': s['followUps.enabled'],
        'voice.record': s['voice.record'],
        'voice.hints': s['voice.hints'],
        'voice.listenIn': s['voice.listenIn'],
      },
      signer: s['contract.signer'],
      company: s['contract.company'],
    }
  },

  async 'sales-contracts'() {
    const [reps, pending] = await Promise.all([prisma.user.findMany({ where: { role: 'SALES' }, orderBy: { name: 'asc' }, select: { id: true, name: true, email: true } }), listPendingLinks()])
    const emails = reps.map((r) => r.email?.toLowerCase()).filter((e): e is string => !!e)
    const accepted = await prisma.agreementAcceptance.findMany({ where: { email: { in: emails } }, orderBy: { signedAt: 'desc' }, select: { email: true, version: true, signedAt: true } })
    const latest = new Map<string, { version: string; signedAt: Date }>()
    for (const a of accepted) if (!latest.has(a.email)) latest.set(a.email, a)
    return {
      version: CONTRACT_VERSION,
      people: reps.map((r) => {
        const e = r.email?.toLowerCase() ?? ''
        const s = latest.get(e)
        const p = pending.find((x) => x.email === e)
        return { id: r.id, name: r.name ?? r.email ?? 'Salesperson', email: r.email, signed: s ? { version: s.version, at: s.signedAt, current: s.version === CONTRACT_VERSION } : null, pending: p ? { url: p.url, expiresAt: p.expiresAt } : null, page: appUrl(`/admin/team/${r.id}`) }
      }),
    }
  },
}

export async function GET(req: Request, ctx: { params: Promise<{ section: string }> }): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  if (user.role !== 'ADMIN') return fail('Admins only.', 403)
  const { section } = await ctx.params
  const load = Object.hasOwn(SECTIONS, section) ? SECTIONS[section] : undefined
  if (!load) return fail('Not found.', 404)
  return json(await load(user, new URL(req.url).searchParams))
}
