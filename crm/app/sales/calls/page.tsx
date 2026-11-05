import type { Prisma } from '@prisma/client'
import { ChevronDown, Clock, Mic, PhoneCall, PhoneIncoming, PhoneMissed, PhoneOutgoing, Sparkles, Star, Users } from 'lucide-react'
import Link from 'next/link'
import { CallFilters, type CallTab } from '@/components/calls/CallFilters'
import { PageIntro } from '@/components/PageIntro'
import { EmptyState } from '@/components/ui/empty-state'
import { IconChip, StatTile, Tag, type Tone } from '@/components/ui/tone'
import { requireUser } from '@/lib/auth'
import { avatarPath } from '@/lib/avatar'
import { asAnalysis } from '@/lib/call-analysis'
import { CALL_STATUS_LABEL, OUTCOME_TONE, callResult, scoreTone } from '@/lib/call-ui'
import { CALL_OUTCOMES, fmtDuration } from '@/lib/calls'
import { leadName } from '@/lib/format'
import { formatPhone } from '@/lib/phone-numbers'
import { prisma } from '@/lib/prisma'
import { localDateKey, localMidnight } from '@/lib/time'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Calls' }
export const dynamic = 'force-dynamic'

const DAY = 86_400_000
const PAGE = 60

const VIEWS = ['all', 'talked', 'missed', 'incoming', 'callback'] as const
type View = (typeof VIEWS)[number]
const RANGES = ['today', '7d', '30d', 'all'] as const
type Range = (typeof RANGES)[number]

const VIEW_WHERE: Record<View, Prisma.CallWhereInput> = {
  all: {},
  talked: { status: 'COMPLETED', durationSec: { gt: 0 } },
  missed: { OR: [{ status: { in: ['BUSY', 'NO_ANSWER', 'FAILED', 'CANCELED'] } }, { status: 'COMPLETED', OR: [{ durationSec: null }, { durationSec: 0 }] }] },
  incoming: { direction: 'INBOUND' },
  callback: { outcome: 'callback' },
}

type Row = Awaited<ReturnType<typeof loadCalls>>[number]

function loadCalls(where: Prisma.CallWhereInput, take: number) {
  return prisma.call.findMany({
    where,
    orderBy: { startedAt: 'desc' },
    take,
    select: {
      id: true,
      leadId: true,
      userId: true,
      prospectId: true,
      direction: true,
      status: true,
      startedAt: true,
      durationSec: true,
      outcome: true,
      toNumber: true,
      recordingSid: true,
      analysisStatus: true,
      analysis: true,
      lead: { select: { firstName: true, lastName: true, email: true, company: true } },
      prospect: { select: { name: true } },
      user: { select: { name: true, email: true } },
    },
  })
}

/** Search by name, company, email or number. */
function searchWhere(q: string): Prisma.CallWhereInput | null {
  const t = q.trim()
  if (!t) return null
  const or: Prisma.CallWhereInput[] = [
    { lead: { firstName: { contains: t, mode: 'insensitive' } } },
    { lead: { lastName: { contains: t, mode: 'insensitive' } } },
    { lead: { company: { contains: t, mode: 'insensitive' } } },
    { lead: { email: { contains: t, mode: 'insensitive' } } },
    { prospect: { name: { contains: t, mode: 'insensitive' } } },
  ]
  // a full name ("dana levi")
  const [first, ...rest] = t.split(/\s+/)
  if (rest.length) or.push({ lead: { firstName: { contains: first, mode: 'insensitive' }, lastName: { contains: rest.join(' '), mode: 'insensitive' } } })
  // a number, typed any way (050-123-4567, +972 50…): match on the national digits
  const digits = t.replace(/\D/g, '').replace(/^(00)?972/, '').replace(/^0/, '')
  if (digits.length >= 3) or.push({ toNumber: { contains: digits } }, { fromNumber: { contains: digits } })
  return { OR: or }
}

/** Calls, organized: by day, with repeat attempts to the same contact folded together. Salespeople see their own; admins see everyone. */
export default async function CallsPage(props: { searchParams: Promise<{ person?: string; view?: string; range?: string; q?: string; limit?: string }> }): Promise<React.ReactElement> {
  const user = await requireUser(['ADMIN', 'SALES'])
  const isAdmin = user.role === 'ADMIN'
  const sp = await props.searchParams
  const person = isAdmin ? (sp.person ?? '') : user.id
  const view: View = (VIEWS as readonly string[]).includes(sp.view ?? '') ? (sp.view as View) : 'all'
  const range: Range = (RANGES as readonly string[]).includes(sp.range ?? '') ? (sp.range as Range) : '30d'
  const q = (sp.q ?? '').slice(0, 80)
  const limit = Math.min(Math.max(Number(sp.limit) || PAGE, PAGE), 1000)

  const me = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } })
  const tz = me.timeZone
  const now = new Date()
  const since = range === 'today' ? localMidnight(now, tz) : range === '7d' ? localMidnight(now, tz, -6) : range === '30d' ? localMidnight(now, tz, -29) : null

  const base: Prisma.CallWhereInput = {
    AND: [{ simulated: false }, isAdmin ? (person ? { userId: person } : {}) : { OR: [{ userId: user.id }, { shares: { some: { userId: user.id } } }] }, since ? { startedAt: { gte: since } } : {}, searchWhere(q) ?? {}],
  }
  const where = (v: View): Prisma.CallWhereInput => ({ AND: [base, VIEW_WHERE[v]] })

  const [calls, counts, recent, people] = await Promise.all([
    loadCalls(where(view), limit),
    Promise.all(VIEWS.map((v) => prisma.call.count({ where: where(v) }))),
    prisma.call.findMany({ where: { simulated: false, startedAt: { gte: new Date(now.getTime() - 30 * DAY) }, ...(isAdmin ? {} : { userId: user.id }) }, select: { userId: true, status: true, durationSec: true, analysis: true, startedAt: true } }),
    isAdmin ? prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SALES'] } }, select: { id: true, name: true, email: true, image: true }, orderBy: { name: 'asc' } }) : Promise.resolve([]),
  ])
  const count = Object.fromEntries(VIEWS.map((v, i) => [v, counts[i] ?? 0])) as Record<View, number>

  // Last 30 days per person: volume, connect rate, talk time, average score, the 7-day trend
  const todayKey = localDateKey(now, tz)
  const stats = new Map<string, { calls: number; today: number; connected: number; talk: number; scores: number[]; recent: number[]; earlier: number[] }>()
  for (const c of recent) {
    const k = c.userId ?? 'gone'
    const e = stats.get(k) ?? { calls: 0, today: 0, connected: 0, talk: 0, scores: [], recent: [], earlier: [] }
    e.calls++
    if (localDateKey(c.startedAt, tz) === todayKey) e.today++
    if (callResult(c) === 'talked') e.connected++
    e.talk += c.durationSec ?? 0
    const a = asAnalysis(c.analysis)
    if (a?.isSalesCall) {
      e.scores.push(a.overallScore)
      ;(c.startedAt.getTime() > now.getTime() - 7 * DAY ? e.recent : e.earlier).push(a.overallScore)
    }
    stats.set(k, e)
  }
  const avg = (xs: number[]): number | null => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null)
  const nameOf = new Map(people.map((p) => [p.id, p.name ?? p.email ?? 'Teammate']))
  const photoOf = new Map(people.map((p) => [p.id, avatarPath(p)]))
  const team = [...stats.values()].reduce((t, s) => ({ calls: t.calls + s.calls, today: t.today + s.today, connected: t.connected + s.connected, talk: t.talk + s.talk, scores: [...t.scores, ...s.scores] }), { calls: 0, today: 0, connected: 0, talk: 0, scores: [] as number[] })
  const mine = isAdmin ? team : (stats.get(user.id) ?? { calls: 0, today: 0, connected: 0, talk: 0, scores: [] })
  const avgScore = avg(mine.scores)

  const tabs: CallTab[] = [
    { key: 'all', label: 'All calls', count: count.all, dot: 'bg-slate-400' },
    { key: 'talked', label: 'Conversations', count: count.talked, dot: 'bg-emerald-400' },
    { key: 'missed', label: 'No answer', count: count.missed, dot: 'bg-amber-400' },
    { key: 'incoming', label: 'Incoming', count: count.incoming, dot: 'bg-sky-400' },
    { key: 'callback', label: 'Call back', count: count.callback, dot: 'bg-orange-400' },
  ]

  // By day, then by contact within the day (the latest attempt leads, earlier ones fold under it)
  const days: { key: string; label: string; groups: [Row, ...Row[]][] }[] = []
  for (const c of calls) {
    const key = localDateKey(c.startedAt, tz)
    let day = days.at(-1)
    if (!day || day.key !== key) {
      day = { key, label: dayLabel(c.startedAt, key, todayKey, tz), groups: [] }
      days.push(day)
    }
    const who = c.leadId ?? c.prospectId ?? c.toNumber
    const g = day.groups.find((x) => (x[0].leadId ?? x[0].prospectId ?? x[0].toNumber) === who)
    if (g) g.push(c)
    else day.groups.push([c])
  }
  const shown = calls.length
  const total = count[view]
  const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })
  const moreHref = (() => {
    const p = new URLSearchParams()
    if (isAdmin && person) p.set('person', person)
    if (view !== 'all') p.set('view', view)
    if (range !== '30d') p.set('range', range)
    if (q) p.set('q', q)
    p.set('limit', String(limit + PAGE))
    return `/sales/calls?${p}`
  })()

  return (
    <div className="space-y-6">
      <PageIntro title="Calls" hint={isAdmin ? 'Every call made from the CRM, by day. Repeat tries to the same person are folded together; click a call for the recording, transcript and coaching.' : 'Your calls, by day. Repeat tries to the same person are folded together; click a call for the recording and coaching.'} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={<PhoneCall />} tone="blue" label="Today" value={mine.today} sub={`${mine.calls} in the last 30 days`} />
        <StatTile icon={<PhoneOutgoing />} tone="emerald" label="Connected" value={mine.calls ? `${Math.round((mine.connected / mine.calls) * 100)}%` : '—'} sub={`${mine.connected} conversations · 30 days`} />
        <StatTile icon={<Clock />} tone="violet" label="Talk time" value={talkTime(mine.talk)} sub="Last 30 days" />
        <StatTile icon={<Star />} tone="amber" label="Average score" value={<span className={cn(avgScore != null && scoreTone(avgScore).text)}>{avgScore ?? '—'}</span>} sub={avgScore == null ? 'After the first analyzed call' : `${mine.scores.length} analyzed calls`} muted={avgScore == null} />
      </div>

      {isAdmin && stats.size > 0 ? (
        <details className="group rounded-2xl border bg-card/60" open={!person}>
          <summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <IconChip tone="indigo" size="sm">
              <Users />
            </IconChip>
            <span className="text-sm font-medium">Team, last 30 days</span>
            <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground transition group-open:rotate-180" aria-hidden />
          </summary>
          <div className="overflow-x-auto border-t px-4 pb-2">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 font-medium">Person</th>
                  <th className="py-2 text-right font-medium">Today</th>
                  <th className="py-2 text-right font-medium">Calls</th>
                  <th className="py-2 text-right font-medium">Connected</th>
                  <th className="py-2 text-right font-medium">Talk time</th>
                  <th className="py-2 text-right font-medium">Avg score</th>
                  <th className="py-2 text-right font-medium">Trend (7d)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {[...stats.entries()]
                  .sort((a, b) => b[1].calls - a[1].calls)
                  .map(([id, s]) => {
                    const score = avg(s.scores)
                    const r = avg(s.recent)
                    const e = avg(s.earlier)
                    const trend = r != null && e != null ? r - e : null
                    const name = nameOf.get(id) ?? 'Former teammate'
                    return (
                      <tr key={id} className={cn(person === id && 'bg-primary/5')}>
                        <td className="py-2.5">
                          <Link href={id === 'gone' ? '/sales/calls' : `/sales/calls?person=${id}`} className="inline-flex items-center gap-2 font-medium hover:underline">
                            <span aria-hidden className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 text-[11px] font-semibold text-white ring-1 ring-border">
                              {name.charAt(0).toUpperCase()}
                              {/* the photo covers the initial once loaded; if it fails, the initial stays */}
                              {photoOf.get(id) ? (
                                // eslint-disable-next-line @next/next/no-img-element -- our own cached square avatar
                                <img src={photoOf.get(id) ?? undefined} alt="" width={28} height={28} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
                              ) : null}
                            </span>
                            {name}
                          </Link>
                        </td>
                        <td className="py-2.5 text-right tabular-nums">{s.today}</td>
                        <td className="py-2.5 text-right tabular-nums">{s.calls}</td>
                        <td className="py-2.5 text-right tabular-nums">{s.calls ? `${Math.round((s.connected / s.calls) * 100)}%` : '—'}</td>
                        <td className="py-2.5 text-right tabular-nums">{talkTime(s.talk)}</td>
                        <td className={cn('py-2.5 text-right font-semibold tabular-nums', score != null && scoreTone(score).text)}>{score ?? '—'}</td>
                        <td className={cn('py-2.5 text-right tabular-nums', trend == null ? 'text-muted-foreground' : trend >= 0 ? 'text-emerald-300' : 'text-rose-300')}>{trend == null ? '—' : `${trend >= 0 ? '+' : ''}${trend}`}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}

      <CallFilters tabs={tabs} view={view} range={range} q={q} person={isAdmin ? person : ''} people={isAdmin ? people.map((p) => ({ id: p.id, label: p.name ?? p.email ?? 'Teammate' })) : null} />

      {calls.length === 0 ? (
        <EmptyState
          title={count.all === 0 && !q && range === 'all' ? 'No calls yet' : 'No calls match'}
          description={count.all === 0 && !q && range === 'all' ? 'Calls made with the phone button show up here with their recording and coaching.' : q ? `Nothing for “${q}” here. Try another name or number, or a longer time window.` : 'Try another tab or a longer time window.'}
        />
      ) : (
        <div className="space-y-6">
          {days.map((day) => {
            const all = day.groups.flat()
            const talked = all.filter((c) => callResult(c) === 'talked')
            const talk = all.reduce((s, c) => s + (c.durationSec ?? 0), 0)
            return (
              <section key={day.key} aria-label={day.label}>
                <header className="sticky top-0 z-10 -mx-1 mb-2 flex items-baseline gap-3 bg-background/85 px-1 py-1.5 backdrop-blur">
                  <h2 className="text-sm font-semibold">{day.label}</h2>
                  <p className="text-xs text-muted-foreground">
                    {all.length} {all.length === 1 ? 'call' : 'calls'}
                    {talked.length ? ` · ${talked.length} talked` : ''}
                    {talk ? ` · ${talkTime(talk)} on the phone` : ''}
                  </p>
                </header>
                <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border bg-card/60">
                  {day.groups.map((g) => (
                    <CallGroup key={g[0].id} calls={g} isAdmin={isAdmin && !person} viewerId={user.id} time={(d) => timeFmt.format(d)} />
                  ))}
                </ul>
              </section>
            )
          })}
          <div className="flex flex-col items-center gap-2 pt-1 text-xs text-muted-foreground">
            <span>
              Showing {shown} of {total} {total === 1 ? 'call' : 'calls'}
            </span>
            {shown < total ? (
              <Link href={moreHref} scroll={false} className="rounded-full border px-4 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted">
                Show more
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

/** Talk time that reads at a glance: 4:05 under an hour, then 3h 22m. */
function talkTime(sec: number): string {
  if (sec < 3600) return fmtDuration(sec)
  const m = Math.round(sec / 60)
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}

function dayLabel(d: Date, key: string, todayKey: string, tz: string): string {
  if (key === todayKey) return 'Today'
  if (key === localDateKey(new Date(Date.now() - DAY), tz) && Date.now() - d.getTime() < 2 * DAY) return 'Yesterday'
  const sameYear = key.slice(0, 4) === todayKey.slice(0, 4)
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) }).format(d)
}

function look(c: Row): { tone: Tone; icon: React.ReactElement; label: string } {
  const r = callResult(c)
  if (r === 'live') return { tone: 'sky', icon: <PhoneCall />, label: CALL_STATUS_LABEL[c.status] ?? 'Calling' }
  if (r === 'missed') return c.direction === 'INBOUND' ? { tone: 'rose', icon: <PhoneMissed />, label: 'Missed' } : { tone: 'amber', icon: <PhoneMissed />, label: c.status === 'COMPLETED' ? 'No talk' : (CALL_STATUS_LABEL[c.status] ?? 'No answer') }
  return { tone: 'emerald', icon: c.direction === 'INBOUND' ? <PhoneIncoming /> : <PhoneOutgoing />, label: c.direction === 'INBOUND' ? 'Incoming' : 'Outgoing' }
}

const who = (c: Row): { name: string; sub: string | null } => {
  if (c.lead) {
    const name = leadName(c.lead)
    return { name, sub: c.lead.company && c.lead.company !== name ? c.lead.company : null }
  }
  if (c.prospect) return { name: c.prospect.name, sub: 'Call list' }
  return { name: formatPhone(c.toNumber), sub: null }
}

/** One contact on one day: the latest call as the row, earlier tries folded underneath. */
function CallGroup({ calls, isAdmin, viewerId, time }: { calls: [Row, ...Row[]]; isAdmin: boolean; viewerId: string; time: (d: Date) => string }): React.ReactElement {
  const [c, ...earlier] = calls
  const l = look(c)
  const p = who(c)
  const a = asAnalysis(c.analysis)
  const score = a?.isSalesCall ? a.overallScore : null
  const rep = isAdmin ? (c.user ? (c.user.name ?? c.user.email) : 'Former teammate') : c.userId !== viewerId ? `Shared with you${c.user ? ` · ${c.user.name ?? c.user.email}` : ''}` : null
  return (
    <li>
      <Link href={`/sales/calls/${c.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted/30">
        <IconChip tone={l.tone} size="sm">
          {l.icon}
        </IconChip>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium">{p.name}</span>
            {earlier.length ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground" title={`${calls.length} calls to this contact on this day`}>
                {calls
                  .slice(0, 5)
                  .reverse()
                  .map((x) => (
                    <span key={x.id} className={cn('h-1.5 w-1.5 rounded-full', callResult(x) === 'talked' ? 'bg-emerald-400' : callResult(x) === 'live' ? 'bg-sky-400' : 'bg-amber-400')} />
                  ))}
                {calls.length}×
              </span>
            ) : null}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{[p.sub, c.lead || c.prospect ? formatPhone(c.toNumber) : null, rep].filter(Boolean).join(' · ') || l.label}</span>
        </span>
        <span className="hidden shrink-0 items-center gap-2 sm:flex">
          {c.outcome ? <Tag tone={OUTCOME_TONE[c.outcome] ?? 'slate'}>{CALL_OUTCOMES[c.outcome as keyof typeof CALL_OUTCOMES] ?? c.outcome}</Tag> : <span className="text-xs text-muted-foreground">{l.label}</span>}
        </span>
        <span className="flex shrink-0 flex-col items-end text-xs tabular-nums sm:w-20">
          <span className="text-foreground/90">{time(c.startedAt)}</span>
          <span className="text-muted-foreground">{c.durationSec ? fmtDuration(c.durationSec) : '—'}</span>
        </span>
        <span className="flex shrink-0 items-center justify-end gap-1.5 empty:hidden sm:w-14 sm:empty:flex">
          {c.recordingSid ? <Mic className="h-3.5 w-3.5 text-muted-foreground" aria-label="Recorded" /> : null}
          {score != null ? (
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ring-1', scoreTone(score).bg, scoreTone(score).text, scoreTone(score).ring)} title="Call score">
              {score}
            </span>
          ) : c.analysisStatus === 'processing' || c.analysisStatus === 'pending' ? (
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-violet-300" aria-label="Analyzing" />
          ) : null}
        </span>
      </Link>
      {earlier.length ? (
        <details className="group/more">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 py-1.5 pl-[3.75rem] pr-4 text-xs text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronDown className="h-3.5 w-3.5 transition group-open/more:rotate-180" aria-hidden />
            {earlier.length} earlier {earlier.length === 1 ? 'try' : 'tries'} this day
          </summary>
          <ul className="pb-2">
            {earlier.map((x) => {
              const xl = look(x)
              return (
                <li key={x.id}>
                  <Link href={`/sales/calls/${x.id}`} className="flex items-center gap-3 py-1.5 pl-[3.75rem] pr-4 text-xs transition hover:bg-muted/30">
                    <span className={cn('h-1.5 w-1.5 rounded-full', xl.tone === 'emerald' ? 'bg-emerald-400' : xl.tone === 'sky' ? 'bg-sky-400' : xl.tone === 'rose' ? 'bg-rose-400' : 'bg-amber-400')} />
                    <span className="w-16 tabular-nums text-foreground/90">{time(x.startedAt)}</span>
                    <span className="flex-1 truncate text-muted-foreground">{x.outcome ? (CALL_OUTCOMES[x.outcome as keyof typeof CALL_OUTCOMES] ?? x.outcome) : xl.label}</span>
                    <span className="text-right tabular-nums text-muted-foreground sm:w-20">{x.durationSec ? fmtDuration(x.durationSec) : '—'}</span>
                    <span className="hidden w-14 sm:block" aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ul>
        </details>
      ) : null}
    </li>
  )
}
