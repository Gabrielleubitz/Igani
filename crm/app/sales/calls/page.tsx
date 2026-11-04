import { Mic, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { PageIntro } from '@/components/PageIntro'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { requireUser } from '@/lib/auth'
import { asAnalysis } from '@/lib/call-analysis'
import { CALL_STATUS_LABEL, scoreTone } from '@/lib/call-ui'
import { CALL_OUTCOMES, fmtDuration } from '@/lib/calls'
import { formatDateTime, leadName } from '@/lib/format'
import { formatPhone } from '@/lib/phone-numbers'
import { prisma } from '@/lib/prisma'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Calls' }
export const dynamic = 'force-dynamic'

const DAY = 86_400_000

/** Calls with their recordings and scores. Salespeople see their own; admins see everyone, with a per-person summary. */
export default async function CallsPage(props: { searchParams: Promise<{ person?: string }> }): Promise<React.ReactElement> {
  const user = await requireUser(['ADMIN', 'SALES'])
  const isAdmin = user.role === 'ADMIN'
  const sp = await props.searchParams
  const person = isAdmin ? sp.person : user.id
  const since = new Date(Date.now() - 30 * DAY)
  const [calls, recent, people, me] = await Promise.all([
    prisma.call.findMany({
      where: { simulated: false, ...(person ? { userId: person } : {}) },
      orderBy: { startedAt: 'desc' },
      take: 100,
      select: { id: true, userId: true, status: true, startedAt: true, durationSec: true, outcome: true, toNumber: true, recordingSid: true, analysisStatus: true, analysis: true, lead: { select: { id: true, firstName: true, lastName: true, email: true, company: true } }, user: { select: { name: true, email: true } } },
    }),
    prisma.call.findMany({ where: { simulated: false, startedAt: { gte: since }, ...(isAdmin ? {} : { userId: user.id }) }, select: { userId: true, status: true, durationSec: true, analysis: true, startedAt: true } }),
    isAdmin ? prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SALES'] } }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }) : Promise.resolve([]),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } }),
  ])

  // Last 30 days per person: volume, connect rate, talk time, average score (and the trend: last 7 days vs before)
  const stats = new Map<string, { calls: number; connected: number; talk: number; scores: number[]; recent: number[]; earlier: number[] }>()
  for (const c of recent) {
    const k = c.userId ?? 'gone'
    const e = stats.get(k) ?? { calls: 0, connected: 0, talk: 0, scores: [], recent: [], earlier: [] }
    e.calls++
    if (c.status === 'COMPLETED' && (c.durationSec ?? 0) > 0) e.connected++
    e.talk += c.durationSec ?? 0
    const a = asAnalysis(c.analysis)
    if (a?.isSalesCall) {
      e.scores.push(a.overallScore)
      ;(c.startedAt.getTime() > Date.now() - 7 * DAY ? e.recent : e.earlier).push(a.overallScore)
    }
    stats.set(k, e)
  }
  const avg = (xs: number[]): number | null => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null)
  const nameOf = new Map(people.map((p) => [p.id, p.name ?? p.email ?? 'Teammate']))
  const mine = stats.get(user.id)

  const tile = (label: string, value: string, sub?: string, tone?: string): React.ReactElement => (
    <div className="rounded-xl border bg-card p-4">
      <div className={cn('text-2xl font-semibold tabular-nums', tone)}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {sub ? <div className="mt-0.5 text-[11px] text-muted-foreground/80">{sub}</div> : null}
    </div>
  )

  return (
    <div className="space-y-5">
      <PageIntro title="Calls" hint={isAdmin ? 'Every call made from the CRM: recordings, transcripts, scores and coaching. Click a call for the full review.' : 'Your calls: recordings, transcripts, and coaching on how each one went.'} />

      {!isAdmin ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tile('Calls (30 days)', String(mine?.calls ?? 0))}
          {tile('Connected', mine?.calls ? `${Math.round(((mine.connected ?? 0) / mine.calls) * 100)}%` : '—', `${mine?.connected ?? 0} conversations`)}
          {tile('Talk time', fmtDuration(mine?.talk ?? 0))}
          {(() => {
            const s = avg(mine?.scores ?? [])
            return tile('Average score', s == null ? '—' : String(s), s == null ? 'Scores appear after your first analyzed call' : `${mine?.scores.length} analyzed calls`, s == null ? undefined : scoreTone(s).text)
          })()}
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Team, last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.size === 0 ? (
              <p className="text-sm text-muted-foreground">No calls in the last 30 days.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="py-2 font-medium">Person</th>
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
                        return (
                          <tr key={id}>
                            <td className="py-2.5">
                              <Link href={`/sales/calls?person=${id}`} className="font-medium hover:underline">
                                {nameOf.get(id) ?? 'Former teammate'}
                              </Link>
                            </td>
                            <td className="py-2.5 text-right tabular-nums">{s.calls}</td>
                            <td className="py-2.5 text-right tabular-nums">{s.calls ? `${Math.round((s.connected / s.calls) * 100)}%` : '—'}</td>
                            <td className="py-2.5 text-right tabular-nums">{fmtDuration(s.talk)}</td>
                            <td className={cn('py-2.5 text-right font-semibold tabular-nums', score != null && scoreTone(score).text)}>{score ?? '—'}</td>
                            <td className={cn('py-2.5 text-right tabular-nums', trend == null ? 'text-muted-foreground' : trend >= 0 ? 'text-emerald-300' : 'text-rose-300')}>{trend == null ? '—' : `${trend >= 0 ? '+' : ''}${trend}`}</td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isAdmin ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/sales/calls" className={cn('rounded-full border px-3 py-1', !person ? 'border-primary/50 bg-primary/15 font-medium' : 'text-muted-foreground hover:bg-muted')}>
            Everyone
          </Link>
          {people.map((p) => (
            <Link key={p.id} href={`/sales/calls?person=${p.id}`} className={cn('rounded-full border px-3 py-1', person === p.id ? 'border-primary/50 bg-primary/15 font-medium' : 'text-muted-foreground hover:bg-muted')}>
              {p.name ?? p.email}
            </Link>
          ))}
        </div>
      ) : null}

      {calls.length === 0 ? (
        <EmptyState title="No calls yet" description="Calls made with the phone button show up here with their recording and coaching." />
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {calls.map((c) => {
            const a = asAnalysis(c.analysis)
            const score = a?.isSalesCall ? a.overallScore : null
            return (
              <li key={c.id}>
                <Link href={`/sales/calls/${c.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition hover:bg-muted/30">
                  <span className="w-36 shrink-0 text-xs text-muted-foreground">{formatDateTime(c.startedAt, me.timeZone)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.lead ? leadName(c.lead) : formatPhone(c.toNumber)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[isAdmin ? (c.user ? (c.user.name ?? c.user.email) : 'Former teammate') : null, CALL_STATUS_LABEL[c.status], c.durationSec ? fmtDuration(c.durationSec) : null, c.outcome ? CALL_OUTCOMES[c.outcome as keyof typeof CALL_OUTCOMES] : null, a?.outcome.label].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {c.recordingSid ? <Mic className="h-4 w-4 text-muted-foreground" aria-label="Recorded" /> : null}
                    {score != null ? (
                      <span className={cn('rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums ring-1', scoreTone(score).bg, scoreTone(score).text, scoreTone(score).ring)}>{score}</span>
                    ) : c.analysisStatus === 'processing' || c.analysisStatus === 'pending' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden /> Analyzing
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
