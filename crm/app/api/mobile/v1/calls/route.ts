import type { Prisma } from '@prisma/client'
import { asAnalysis } from '@/lib/call-analysis'
import { RANGES, VIEWS, VIEW_WHERE, searchWhere, type Range, type View } from '@/lib/call-query'
import { callResult } from '@/lib/call-ui'
import { CALL_OUTCOMES } from '@/lib/calls'
import { leadName } from '@/lib/format'
import { fail, json, mobileUser } from '@/lib/mobile'
import { formatPhone } from '@/lib/phone-numbers'
import { prisma } from '@/lib/prisma'
import { localMidnight } from '@/lib/time'

export const dynamic = 'force-dynamic'
const PAGE = 50

/** The Calls page for the app: tabs with counts, a time window, search, paging, and this window's numbers. */
export async function GET(req: Request): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  if (user.role !== 'ADMIN' && user.role !== 'SALES') return fail('Calls are for the sales team.', 403)
  const isAdmin = user.role === 'ADMIN'
  const sp = new URL(req.url).searchParams
  const view: View = (VIEWS as readonly string[]).includes(sp.get('view') ?? '') ? (sp.get('view') as View) : 'all'
  const range: Range = (RANGES as readonly string[]).includes(sp.get('range') ?? '') ? (sp.get('range') as Range) : '30d'
  const q = (sp.get('q') ?? '').slice(0, 80)
  const person = isAdmin ? (sp.get('person') ?? '') : ''
  const page = Math.max(1, Math.min(40, Number(sp.get('page')) || 1))
  const me = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } })
  const now = new Date()
  const since = range === 'today' ? localMidnight(now, me.timeZone) : range === '7d' ? localMidnight(now, me.timeZone, -6) : range === '30d' ? localMidnight(now, me.timeZone, -29) : null
  const base: Prisma.CallWhereInput = {
    AND: [{ simulated: false }, isAdmin ? (person ? { userId: person } : {}) : { OR: [{ userId: user.id }, { shares: { some: { userId: user.id } } }] }, since ? { startedAt: { gte: since } } : {}, searchWhere(q) ?? {}],
  }
  const where = (v: View): Prisma.CallWhereInput => ({ AND: [base, VIEW_WHERE[v]] })
  const [rows, counts, inWindow, people] = await Promise.all([
    prisma.call.findMany({
      where: where(view),
      orderBy: { startedAt: 'desc' },
      skip: (page - 1) * PAGE,
      take: PAGE,
      select: { id: true, leadId: true, direction: true, status: true, startedAt: true, durationSec: true, outcome: true, toNumber: true, fromNumber: true, recordingSid: true, analysisStatus: true, analysis: true, lead: { select: { firstName: true, lastName: true, email: true, company: true } }, prospect: { select: { name: true } }, user: { select: { name: true, email: true } } },
    }),
    Promise.all(VIEWS.map((v) => prisma.call.count({ where: where(v) }))),
    prisma.call.findMany({ where: base, select: { status: true, durationSec: true, analysis: true } }),
    isAdmin ? prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SALES'] } }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }) : Promise.resolve([]),
  ])
  const scores = inWindow.flatMap((c) => {
    const a = asAnalysis(c.analysis)
    return a?.isSalesCall ? [a.overallScore] : []
  })
  return json({
    isAdmin,
    tabs: VIEWS.map((v, i) => ({ key: v, count: counts[i] ?? 0 })),
    more: page * PAGE < (counts[VIEWS.indexOf(view)] ?? 0),
    stats: {
      calls: inWindow.length,
      talked: inWindow.filter((c) => callResult(c) === 'talked').length,
      talkSec: inWindow.reduce((s, c) => s + (c.durationSec ?? 0), 0),
      avgScore: scores.length ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length) : null,
    },
    people: people.map((p) => ({ id: p.id, name: p.name ?? p.email ?? 'Teammate' })),
    calls: rows.map((c) => {
      const a = asAnalysis(c.analysis)
      const number = c.direction === 'INBOUND' ? c.fromNumber : c.toNumber
      return {
        id: c.id,
        leadId: c.leadId,
        name: c.lead ? leadName(c.lead) : (c.prospect?.name ?? formatPhone(number)),
        company: c.lead?.company ?? (c.prospect ? 'Call list' : null),
        number: formatPhone(number),
        direction: c.direction,
        status: c.status,
        result: callResult(c),
        outcome: c.outcome,
        outcomeLabel: c.outcome ? (CALL_OUTCOMES[c.outcome as keyof typeof CALL_OUTCOMES] ?? c.outcome) : null,
        startedAt: c.startedAt,
        durationSec: c.durationSec,
        recorded: Boolean(c.recordingSid),
        score: a?.isSalesCall ? a.overallScore : null,
        analyzing: c.analysisStatus === 'processing' || c.analysisStatus === 'pending',
        by: isAdmin ? (c.user?.name ?? c.user?.email ?? null) : null,
      }
    }),
  })
}
