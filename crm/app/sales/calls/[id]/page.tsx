import { ArrowLeft, CheckCircle2, CircleDashed, Crosshair, MessageCircleQuestion, Target, TrendingUp, TriangleAlert, XCircle } from 'lucide-react'
import { BENCHMARKS } from '@/lib/call-coaching'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AnalysisRefresher, CallPlayerProvider, ReanalyzeButton, SeekButton, Transcript } from '@/components/calls/CallView'
import { StraightLinePanel } from '@/components/calls/StraightLinePanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { STEPS, asAnalysis, asTranscript } from '@/lib/call-analysis'
import { CALL_STATUS_LABEL, RUBRIC, scoreTone } from '@/lib/call-ui'
import { CALL_OUTCOMES, fmtDuration } from '@/lib/calls'
import { formatDateTime, leadName } from '@/lib/format'
import { formatPhone } from '@/lib/phone-numbers'
import { prisma } from '@/lib/prisma'
import { listVideos } from '@/lib/video'
import { courseOrder } from '@/lib/video-core'
import { unlockedFor } from '@/lib/video-progress'
import { cn } from '@/lib/utils'

const STEP_LABEL: Record<(typeof STEPS)[number], string> = { rapport: 'Rapport', intelligence: 'Questions', control: 'Control', threeTens: 'Three tens', looping: 'Looping', closing: 'Closing', ethics: 'Ethics' }

export const metadata = { title: 'Call' }
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // "Analyze again" runs the whole analysis in this request

/** One call: the recording, the analysis and coaching (CallMap-style), and the transcript. The caller and admins only. */
export default async function CallPage(props: { params: Promise<{ id: string }> }): Promise<React.ReactElement> {
  const user = await requireUser(['ADMIN', 'SALES'])
  const { id } = await props.params
  const call = await prisma.call.findUnique({ where: { id }, include: { lead: { select: { id: true, firstName: true, lastName: true, email: true, company: true } }, user: { select: { name: true, email: true } } } })
  if (!call || (user.role !== 'ADMIN' && call.userId !== user.id)) notFound()
  const me = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } })
  const a = asAnalysis(call.analysis)
  const lines = asTranscript(call.transcript)
  const rep = call.user?.name?.split(' ')[0] ?? 'Rep'
  // a player only when there is (or may be, if our callback was missed) a Twilio recording
  const recorded = Boolean(call.recordingSid) || (Boolean(call.twilioCallSid) && call.status === 'COMPLETED' && !call.simulated && (call.durationSec ?? 0) > 0)
  const working = call.analysisStatus === 'processing' || call.analysisStatus === 'pending'
  const tone = a ? scoreTone(a.overallScore) : null
  // Lesson links in the Straight Line panel: episode number -> video (by its "01 -" title prefix), and whether this viewer has unlocked it
  const lessons: Record<number, { id: string; unlocked: boolean } | undefined> = {}
  if (a?.straightLine?.lessons.length) {
    const course = courseOrder(await listVideos())
    const open = user.role === 'SALES' ? new Set((await unlockedFor(user.id)).unlocked) : null
    for (const v of course) {
      const n = Number(/^\s*(\d+)/.exec(v.title)?.[1])
      if (n) lessons[n] = { id: v.id, unlocked: open ? open.has(v.id) : true }
    }
  }

const renderAnalysis = (a: NonNullable<ReturnType<typeof asAnalysis>>): React.ReactElement => {
    const summary = (
      <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <p className="leading-relaxed">{a.summary}</p>
                    {a.straightLine?.verdict ? (
                      <div className="rounded-lg bg-primary/10 px-3 py-2 ring-1 ring-primary/30">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">The Straight Line says</div>
                        <p dir="auto" className="mt-0.5">{a.straightLine.verdict}</p>
                      </div>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-muted-foreground">Outcome</div>
                        <div className="mt-0.5 font-medium">{a.outcome.label}</div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-muted-foreground">Next step</div>
                        <div className={cn('mt-0.5 font-medium', (!a.nextStep || a.nextStepQuality === 'vague') && 'text-amber-300')}>{a.nextStep ?? 'None agreed'}</div>
                        {a.nextStepQuality === 'vague' ? <div className="mt-1 text-[11px] text-amber-300/80">Vague: no date or owner. Book a specific time before hanging up.</div> : a.nextStepQuality === 'specific' ? <div className="mt-1 text-[11px] text-emerald-300/80">Specific and dated</div> : null}
                      </div>
                    </div>
                    {a.clientNeeds.length ? (
                      <div>
                        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">What they need</div>
                        <ul className="space-y-1">
                          {a.clientNeeds.map((n) => (
                            <li key={n} className="flex gap-2">
                              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                              <span dir="auto">{n}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
      </>
    )
    const scorecard = (
      <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Scorecard</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {RUBRIC.filter((r) => a.scores[r.key] != null).map((r) => {
                      const v = a.scores[r.key]!
                      return (
                        <div key={r.key} title={r.hint}>
                          <div className="flex justify-between text-xs">
                            <span>{r.label}</span>
                            <span className="tabular-nums text-muted-foreground">{v}/5</span>
                          </div>
                          <div className="mt-1 flex gap-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <span key={n} className={cn('h-1.5 flex-1 rounded-full', n <= v ? (v >= 4 ? 'bg-emerald-400' : v === 3 ? 'bg-amber-400' : 'bg-rose-400') : 'bg-muted')} />
                            ))}
                          </div>
                        </div>
                      )
                    })}
                    {a.metrics ? (
                      <div className="space-y-2.5 border-t pt-3">
                        {(() => {
                          const m = a.metrics
                          const talkOk = m.talkRatioRep <= BENCHMARKS.talkRatio.max && (!/discovery/i.test(a.callType) || m.talkRatioRep <= BENCHMARKS.talkRatio.discoveryHigh + 5)
                          const monoOk = m.longestMonologueSec <= BENCHMARKS.monologueSec
                          const qOk = !/discovery/i.test(a.callType) || (m.repQuestions >= BENCHMARKS.questions.low - 3 && m.repQuestions <= BENCHMARKS.questions.high + 4)
                          const row = (label: string, value: React.ReactNode, target: string, ok: boolean) => (
                            <div className="flex items-baseline justify-between gap-2 text-xs">
                              <span className="text-muted-foreground">{label}</span>
                              <span className="text-end">
                                <span className={cn('font-semibold tabular-nums', ok ? 'text-emerald-300' : 'text-amber-300')}>{value}</span>
                                <span className="block text-[10px] text-muted-foreground">{target}</span>
                              </span>
                            </div>
                          )
                          return (
                            <>
                              <div>
                                <div className="mb-1 flex h-2 overflow-hidden rounded-full bg-amber-400/70" title={`${rep} ${m.talkRatioRep}% · client ${100 - m.talkRatioRep}%`}>
                                  <span className="h-full bg-primary" style={{ width: `${m.talkRatioRep}%` }} />
                                </div>
                                {row('Talk time', `${m.talkRatioRep}% ${rep} · ${100 - m.talkRatioRep}% client`, 'top reps ~43–46% on discovery, under 65% always', talkOk)}
                              </div>
                              {row('Longest monologue', <>{fmtDuration(m.longestMonologueSec)} {m.longestMonologueAt != null ? <SeekButton at={m.longestMonologueAt} label="play" /> : null}</>, 'keep it under 2:00', monoOk)}
                              {row('Questions asked', `${m.repQuestions} · spread ${m.questionSpread.join(' / ')}`, '11–14 on discovery, spread over the call', qOk)}
                              {row('Client’s longest stretch', fmtDuration(m.longestClientStretchSec), 'longer = they opened up', m.longestClientStretchSec >= 30)}
                            </>
                          )
                        })()}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 border-t pt-3">
                        <div>
                          <div className="text-xs text-muted-foreground">Talk / listen</div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {rep} {a.talkRatioRep}% · client {100 - a.talkRatioRep}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Questions asked</div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-lg font-semibold tabular-nums">
                            <MessageCircleQuestion className="h-4 w-4 text-primary" aria-hidden /> {a.questionsAsked}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
      </>
    )
    const focus = (
      <>
              {a.focus?.length ? (
                <Card className="border-primary/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Crosshair className="h-4 w-4 text-primary" aria-hidden /> {a.straightLine ? 'Do this next call' : 'Focus for the next call'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {a.focus.map((f) => (
                      <div key={f.skill} className="space-y-2 rounded-xl border p-4 text-sm">
                        <div className="font-semibold">{f.skill}</div>
                        <p className="text-muted-foreground">{f.why}</p>
                        <div className="rounded-lg bg-emerald-500/10 px-3 py-2 ring-1 ring-emerald-500/25">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">Say this</div>
                          <p dir="auto" className="mt-0.5">
                            {f.sayThis}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground/80">Drill: </span>
                          {f.drill}
                        </p>
                      </div>
                    ))}
                    {a.nextQuestions?.length ? (
                      <div>
                        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ask next time</div>
                        <ul className="space-y-1 text-sm">
                          {a.nextQuestions.map((q) => (
                            <li key={q} className="flex gap-2">
                              <MessageCircleQuestion className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                              <span dir="auto">{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}
      </>
    )
    const wellwork = (
      <>
              <div className="grid gap-5 md:grid-cols-2 [&>*]:min-w-0">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">What went well</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {a.strengths.map((s) => (
                        <li key={s} className="flex gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">To work on</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {a.improvements.map((s) => (
                        <li key={s} className="flex gap-2">
                          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
      </>
    )
    const moments = (
      <>
              {a.moments.length ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{a.straightLine ? 'Where you left the line' : 'Coaching moments'}</CardTitle>
                    <p className="text-sm text-muted-foreground">{a.straightLine ? 'The moments the Straight Line would have handled differently.' : 'Real moments from the call, and a stronger way to handle them.'}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {a.moments.map((m, i) => (
                      <div key={i} className="space-y-2 rounded-xl border p-4 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          {m.at != null ? <SeekButton at={m.at} /> : null}
                          {m.step ? <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">{STEP_LABEL[m.step]}</span> : null}
                        </div>
                        {m.clientSaid ? (
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">Client said</div>
                            <p dir="auto" className="mt-0.5">
                              {m.clientSaid}
                            </p>
                          </div>
                        ) : null}
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">{rep} said</div>
                          <p dir="auto" className="mt-0.5 text-muted-foreground line-through decoration-rose-400/60">
                            {m.repSaid}
                          </p>
                        </div>
                        <div className="rounded-lg bg-emerald-500/10 px-3 py-2 ring-1 ring-emerald-500/25">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">Try instead</div>
                          <p dir="auto" className="mt-0.5">
                            {m.better}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">{m.why}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}
      </>
    )
    const qual = (
      <>
              {a.qualification || a.buyingSignals?.length || a.riskSignals?.length ? (
                <div className="grid gap-5 md:grid-cols-2 [&>*]:min-w-0">
                  {a.qualification ? (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Qualification</CardTitle>
                        <p className="text-xs text-muted-foreground">What we know about the deal after this call</p>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          {(
                            [
                              ['pain', 'Pain'],
                              ['impact', 'Impact / cost of the problem'],
                              ['decisionMaker', 'Decision maker'],
                              ['decisionProcess', 'Decision process'],
                              ['budget', 'Budget'],
                              ['timeline', 'Timeline'],
                              ['alternatives', 'Alternatives'],
                            ] as const
                          ).map(([k, label]) => {
                            const q = a.qualification![k]
                            return (
                              <li key={k} className="flex gap-2">
                                {q.status === 'covered' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-label="Covered" /> : q.status === 'partly' ? <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-label="Partly" /> : q.status === 'missing' ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-label="Missing" /> : <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" aria-label="Not expected yet" />}
                                <span className="min-w-0">
                                  <span className="font-medium">{label}</span>
                                  {q.status === 'not_expected' ? <span className="text-xs text-muted-foreground"> · not expected yet</span> : null}
                                  {q.note ? (
                                    <span dir="auto" className="block text-xs text-muted-foreground">
                                      {q.note}
                                    </span>
                                  ) : null}
                                </span>
                              </li>
                            )
                          })}
                        </ul>
                        {a.spin ? (
                          <div className="mt-4 border-t pt-3">
                            <div className="mb-1.5 text-xs text-muted-foreground">Question types (SPIN)</div>
                            <div className="grid grid-cols-4 gap-2 text-center">
                              {(
                                [
                                  ['situation', 'Situation'],
                                  ['problem', 'Problem'],
                                  ['implication', 'Implication'],
                                  ['needPayoff', 'Need-payoff'],
                                ] as const
                              ).map(([k, label]) => (
                                <div key={k} className="rounded-lg border px-1 py-2">
                                  <div className={cn('text-lg font-semibold tabular-nums', (k === 'implication' || k === 'needPayoff') && a.spin![k] === 0 && 'text-amber-300')}>{a.spin![k]}</div>
                                  <div className="text-[10px] text-muted-foreground">{label}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  ) : null}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Signals</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div>
                        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-300">Buying signals</div>
                        {a.buyingSignals?.length ? (
                          <ul className="space-y-1.5">
                            {a.buyingSignals.map((x) => (
                              <li key={x} className="flex gap-2">
                                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                                <span>{x}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground">None this call.</p>
                        )}
                      </div>
                      <div>
                        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-rose-300">Risks</div>
                        {a.riskSignals?.length ? (
                          <ul className="space-y-1.5">
                            {a.riskSignals.map((x) => (
                              <li key={x} className="flex gap-2">
                                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden />
                                <span>{x}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground">None this call.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : null}
      </>
    )
    const objact = (
      <>
              <div className="grid gap-5 md:grid-cols-2 [&>*]:min-w-0">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Objections</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {a.objections.length ? (
                      <ul className="space-y-3 text-sm">
                        {a.objections.map((o) => (
                          <li key={o.objection} className="flex gap-2">
                            {o.handledWell ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-label="Handled well" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-label="Not handled well" />}
                            <span>
                              <span dir="auto" className="font-medium">
                                {o.objection}
                              </span>
                              <span dir="auto" className="block text-muted-foreground">
                                {o.response}
                              </span>
                              {o.better ? (
                                <span dir="auto" className="mt-1.5 block rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-sm ring-1 ring-emerald-500/25">
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300">Stronger: </span>
                                  {o.better}
                                </span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No objections came up.</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Action items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {a.actionItems.length ? (
                      <ul className="space-y-2 text-sm">
                        {a.actionItems.map((t) => (
                          <li key={t.text} className="flex gap-2">
                            <span className={cn('mt-0.5 shrink-0 rounded px-1.5 py-px text-[10px] font-semibold uppercase', t.owner === 'rep' ? 'bg-primary/15 text-primary' : 'bg-amber-500/15 text-amber-300')}>{t.owner === 'rep' ? rep : 'Client'}</span>
                            <span dir="auto">{t.text}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No commitments were made.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
      </>
    )
    const transcript = (
      <>
              {lines.length ? (
                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base">Transcript</CardTitle>
                    <ReanalyzeButton callId={call.id} />
                  </CardHeader>
                  <CardContent>
                    <Transcript lines={lines} repName={rep} />
                  </CardContent>
                </Card>
              ) : null}
      </>
    )
    if (a.straightLine) {
      // The Straight Line teaches: its score, comments, drills and lessons come first; the CallMap data is supporting facts
      return (
        <>
          {summary}
          <StraightLinePanel sl={a.straightLine} lessons={lessons} />
          {moments}
          {focus}
          {wellwork}
          <details className="group rounded-xl border">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">Call data (CallMap): talk time, questions, qualification, objections</summary>
            <div className="space-y-5 p-4 [&>*]:min-w-0">
              {scorecard}
              {qual}
              {objact}
            </div>
          </details>
          {transcript}
        </>
      )
    }
    return (
      <>
        <div className="grid gap-5 md:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
          {summary}
          {scorecard}
        </div>
        {focus}
        {wellwork}
        {moments}
        {qual}
        {objact}
        {transcript}
      </>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <AnalysisRefresher active={working} />
      <Link href="/sales/calls" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All calls
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {call.lead ? (
              <Link href={`/sales/leads/${call.lead.id}`} className="hover:underline">
                {leadName(call.lead)}
              </Link>
            ) : (
              formatPhone(call.toNumber)
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[call.lead?.company, call.lead ? formatPhone(call.toNumber) : null, `${call.user ? (call.user.name ?? call.user.email) : 'Former teammate'} called`, formatDateTime(call.startedAt, me.timeZone)].filter(Boolean).join(' · ')}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border px-2 py-0.5 text-muted-foreground">{CALL_STATUS_LABEL[call.status] ?? call.status}</span>
            {call.durationSec ? <span className="rounded-full border px-2 py-0.5 text-muted-foreground">Talk time {fmtDuration(call.durationSec)}</span> : null}
            {call.outcome ? <span className="rounded-full border px-2 py-0.5 text-muted-foreground">{CALL_OUTCOMES[call.outcome as keyof typeof CALL_OUTCOMES] ?? call.outcome}</span> : null}
            {a ? <span className="rounded-full border px-2 py-0.5 text-muted-foreground">{a.callType}</span> : null}
          </div>
        </div>
        {a && tone ? (
          <div className={cn('flex items-center gap-3 rounded-2xl px-4 py-3 ring-1', tone.bg, tone.ring)}>
            <div className={cn('text-4xl font-semibold tabular-nums', tone.text)}>{a.overallScore}</div>
            <div className="text-xs leading-tight text-muted-foreground">
              {a.straightLine ? 'Straight Line score' : 'Call score'}
              <br />
              out of 100
            </div>
          </div>
        ) : null}
      </div>

      <CallPlayerProvider src={recorded ? `/api/calls/${call.id}/recording` : null} durationSec={call.recordingSec ?? call.durationSec}>
        <div className="mt-5 space-y-5">
          {call.notes ? (
            <Card>
              <CardContent className="pt-[var(--card-pad)] text-sm">
                <span className="text-muted-foreground">{rep}’s note: </span>
                {call.notes}
              </CardContent>
            </Card>
          ) : null}

          {!a ? (
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-[var(--card-pad)] text-sm">
                <span className="text-muted-foreground">
                  {working
                    ? 'Analyzing the call: transcript, summary and coaching. This usually takes under a minute.'
                    : call.analysisStatus === 'failed'
                      ? `The analysis didn’t finish: ${call.analysisError ?? 'unknown error'}.`
                      : call.analysisStatus === 'skipped'
                        ? (call.analysisError ?? 'This call wasn’t analyzed.')
                        : recorded
                          ? 'This call hasn’t been analyzed yet.'
                          : 'No recording, so there’s nothing to analyze.'}
                </span>
                {working ? null : recorded ? <ReanalyzeButton callId={call.id} label="Analyze now" /> : null}
              </CardContent>
            </Card>
          ) : (
            renderAnalysis(a)
          )}
        </div>
      </CallPlayerProvider>
    </div>
  )
}
