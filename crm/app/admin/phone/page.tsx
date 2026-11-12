import { CheckCircle2, Circle } from 'lucide-react'
import Link from 'next/link'
import { IncomingRoutingRow, PhoneLineRow, VoiceSettingsForm } from '@/components/admin/PhoneAdmin'
import { PageIntro } from '@/components/PageIntro'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { aiUsageByMonth, fmtTokens, openaiBillByMonth } from '@/lib/ai-usage'
import { RATES, costsByMonth, rateUsd, usd, type CostCall } from '@/lib/call-costs'
import { monthKey } from '@/lib/payouts'
import { CALL_OUTCOMES, fmtDuration } from '@/lib/calls'
import { formatDateTime, leadName } from '@/lib/format'
import { formatPhone } from '@/lib/phone-numbers'
import { prisma } from '@/lib/prisma'
import { listenRelay } from '@/lib/listen'
import { getSetting } from '@/lib/settings'
import { dialerDemo, listTwilioNumbers, routedToCrm, twilioConfig, twilioSetup, type TwilioNumberInfo } from '@/lib/twilio'
import { numberCosts, twilioBills, type NumberCost, type TwilioMonthBill } from '@/lib/twilio-costs'

export const metadata = { title: 'Phone' }
export const dynamic = 'force-dynamic'

const STATUS: Record<string, string> = { INITIATED: 'Starting', RINGING: 'Ringing', IN_PROGRESS: 'On the call', COMPLETED: 'Answered', BUSY: 'Busy', NO_ANSWER: 'No answer', FAILED: 'Failed', CANCELED: 'Hung up' }

/** Admin → Phone: Twilio setup, a number per teammate, recording settings, and the latest calls. */
export default async function PhoneAdminPage(): Promise<React.ReactElement> {
  const admin = await requireUser(['ADMIN'])
  const config = twilioConfig()
  let numbers: TwilioNumberInfo[] | null = null
  let numbersError: string | null = null
  if (config) {
    try {
      numbers = (await listTwilioNumbers(config)).filter((n) => n.voice)
    } catch (err) {
      numbersError = err instanceof Error ? err.message.slice(0, 200) : 'Could not read numbers from Twilio.'
    }
  }
  const [team, lines, record, hints, countries, calls, me, listenIn, reviewModel] = await Promise.all([
    prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SALES'] } }, select: { id: true, name: true, email: true, role: true }, orderBy: { name: 'asc' } }),
    prisma.phoneLine.findMany({ select: { userId: true, number: true, active: true } }),
    getSetting('voice.record'),
    getSetting('voice.hints'),
    getSetting('voice.countries'),
    prisma.call.findMany({ where: { private: false }, orderBy: { startedAt: 'desc' }, take: 25, include: { user: { select: { name: true, email: true } }, lead: { select: { id: true, firstName: true, lastName: true, email: true } } } }),
    prisma.user.findUniqueOrThrow({ where: { id: admin.id }, select: { timeZone: true } }),
    getSetting('voice.listenIn'),
    getSetting('calls.reviewModel'),
  ])
  // Costs per month: the last six months of calls, priced with the estimate rates in lib/call-costs.ts
  const since = new Date(Date.now() - 190 * 86_400_000)
  const costRows = await prisma.call.findMany({
    where: { simulated: false, private: false, startedAt: { gte: since } },
    select: { userId: true, startedAt: true, direction: true, fromNumber: true, toNumber: true, durationSec: true, recordingSec: true, analysisStatus: true, user: { select: { name: true, email: true } } },
  })
  const costCalls: CostCall[] = costRows.map((c) => ({
    userId: c.userId,
    userName: c.user?.name ?? c.user?.email ?? 'Unknown',
    month: monthKey(c.startedAt),
    direction: c.direction,
    otherNumber: c.direction === 'OUTBOUND' ? c.toNumber : c.fromNumber,
    durationSec: c.durationSec,
    recordingSec: c.recordingSec,
    analysisStatus: c.analysisStatus,
  }))
  const costs = costsByMonth(costCalls, hints).slice(0, 6)
  // What Twilio actually billed, what each number costs, and what OpenAI was used for (each part fails on its own)
  const short = (err: unknown): string => (err instanceof Error ? err.message : String(err)).slice(0, 160)
  const [bills, perNumber, aiRows, openaiBill] = await Promise.all([
    config
      ? twilioBills(config, since).then(
          (b) => ({ ok: true as const, b }),
          (e: unknown) => ({ ok: false as const, error: short(e) }),
        )
      : null,
    config
      ? numberCosts(config).then(
          (b) => ({ ok: true as const, b }),
          (e: unknown) => ({ ok: false as const, error: short(e) }),
        )
      : null,
    prisma.aiUsage.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, feature: true, inputTokens: true, outputTokens: true, audioSeconds: true } }),
    openaiBillByMonth(since).then(
      (b) => ({ ok: true as const, b }),
      (e: unknown) => ({ ok: false as const, error: short(e) }),
    ),
  ])
  const billOf = new Map<string, TwilioMonthBill>(bills?.ok ? bills.b.map((b) => [b.month, b]) : [])
  const aiMonths = aiUsageByMonth(aiRows.map((r) => ({ month: monthKey(r.createdAt), feature: r.feature, inputTokens: r.inputTokens, outputTokens: r.outputTokens, audioSeconds: r.audioSeconds })))
  const aiOf = new Map(aiMonths.map((m) => [m.month, m]))
  const estimateOf = new Map(costs.map((m) => [m.month, m]))
  const costMonths = [...new Set([...costs.map((m) => m.month), ...billOf.keys(), ...aiOf.keys()])].sort((a, b) => b.localeCompare(a)).slice(0, 6)
  const numberList: NumberCost[] = perNumber?.ok ? perNumber.b : []
  const numbersMonthly = numberList.reduce((s, x) => s + (x.monthly ?? 0), 0)
  const monthLabel = (k: string): string => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(`${k}-15T00:00:00Z`))
  const lineOf = new Map(lines.map((l) => [l.userId, l]))
  const ownerOf = new Map(lines.map((l) => [l.number, team.find((u) => u.id === l.userId)]))
  const savedRouting = new Set((await prisma.siteSetting.findMany({ where: { key: { startsWith: 'voice.routing:' } }, select: { key: true } })).map((r) => r.key.slice('voice.routing:'.length)))
  const takenBy = Object.fromEntries(lines.map((l) => [l.number, l.userId]))
  const setup = twilioSetup()
  const ready = Boolean(config)

  return (
    <div className="space-y-5">
      <PageIntro title="Phone" hint="Calls from inside the CRM: each teammate calls from their own Twilio number, and every call lands on the contact’s timeline." />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{ready ? 'Twilio is connected' : 'Connect Twilio'}</CardTitle>
          <p className="text-sm text-muted-foreground">{ready ? 'Calls go through your Twilio account.' : dialerDemo() ? 'Not connected yet. While developing, the dialer runs in demo mode (no real calls).' : 'Not connected yet. Add these in Vercel → CRM project → Environment Variables, then redeploy.'}</p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {setup.map((s) => (
              <li key={s.key} className="flex items-center gap-2">
                {s.present ? <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-label="set" /> : <Circle className="h-4 w-4 text-muted-foreground" aria-label="missing" />}
                <code className="text-xs">{s.key}</code>
              </li>
            ))}
          </ul>
          {!ready ? (
            <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
              <li>Twilio console: buy a number per salesperson, and allow Voice calls to Israel / US (Voice → Geo permissions).</li>
              <li>Account → API keys: create a key; its SID and secret are TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET.</li>
              <li>
                Voice → TwiML apps: create one with the voice URL <code>https://app.igani.co/api/public/voice/twiml</code> (POST); its SID is TWILIO_TWIML_APP_SID.
              </li>
              <li>TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are on the console home page (the auth token verifies Twilio’s callbacks).</li>
            </ol>
          ) : null}
          {numbersError ? <p className="text-xs text-rose-400">Couldn’t list your Twilio numbers: {numbersError}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Phone lines</CardTitle>
          <p className="text-sm text-muted-foreground">Each person calls from their own number; clients see it as the caller. {numbers ? `${numbers.length} number${numbers.length === 1 ? '' : 's'} on your Twilio account.` : ''}</p>
        </CardHeader>
        <CardContent className="divide-y divide-border/60">
          {team.map((u) => (
            <PhoneLineRow key={u.id} userId={u.id} name={u.name ?? u.email ?? 'Teammate'} role={u.role ?? ''} current={lineOf.get(u.id)?.number ?? null} numbers={numbers} takenBy={takenBy} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Costs per month</CardTitle>
          <p className="text-sm text-muted-foreground">What Twilio actually billed (numbers, minutes, recordings, texts), what each number costs, and how much the AI was used. The per-person table is an estimate from the calls stored in the CRM.</p>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          {config ? (
            <section className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium">Phone numbers</h3>
                {numberList.length ? (
                  <span className="tabular-nums text-muted-foreground">
                    {numberList.length} {numberList.length === 1 ? 'number' : 'numbers'} · <span className="font-semibold text-foreground">{usd(numbersMonthly)}</span> a month
                  </span>
                ) : null}
              </div>
              {perNumber && !perNumber.ok ? <p className="text-xs text-amber-600 dark:text-amber-400">Couldn’t read the numbers’ prices from Twilio: {perNumber.error}</p> : null}
              {numberList.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[28rem] text-left text-xs">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="py-1 pr-3 font-normal">Number</th>
                        <th className="py-1 pr-3 font-normal">Assigned to</th>
                        <th className="py-1 pr-3 font-normal">Type</th>
                        <th className="py-1 font-normal">Per month</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {numberList.map((x) => {
                        const owner = ownerOf.get(x.number)
                        return (
                          <tr key={x.sid} className="border-t border-border/50">
                            <td className="py-1 pr-3">{formatPhone(x.number)}</td>
                            <td className="py-1 pr-3">{owner ? (owner.name ?? owner.email) : <span className="text-muted-foreground">Not assigned</span>}</td>
                            <td className="py-1 pr-3">{NUMBER_TYPE[x.type]}</td>
                            <td className="py-1">{x.monthly === null ? <span className="text-muted-foreground">See Twilio</span> : usd(x.monthly)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : perNumber?.ok ? (
                <p className="text-muted-foreground">No numbers on the Twilio account.</p>
              ) : null}
            </section>
          ) : null}

          {costMonths.length === 0 ? <p className="text-muted-foreground">No calls yet.</p> : null}
          {costMonths.map((month) => {
            const bill = billOf.get(month)
            const ai = aiOf.get(month)
            const est = estimateOf.get(month)
            const aiBill = openaiBill.ok ? openaiBill.b?.get(month) : undefined
            const headline = bill ? bill.total + (aiBill ?? 0) : null
            return (
              <div key={month} className="space-y-3 border-t pt-4 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-medium">{monthLabel(month)}</h3>
                  {headline !== null ? (
                    <span className="text-lg font-semibold tabular-nums" title={aiBill === undefined ? 'Twilio bill' : 'Twilio and OpenAI bills'}>
                      {usd(headline)}
                    </span>
                  ) : est ? (
                    <span className="text-lg font-semibold tabular-nums" title="Estimate from the calls in the CRM">
                      ≈ {usd(est.all.total)}
                    </span>
                  ) : null}
                </div>

                {bill ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Twilio bill</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                      <CostTile label="Numbers" value={usd(bill.numbers)} note={bill.numberCount ? `${bill.numberCount} ${bill.numberCount === 1 ? 'number' : 'numbers'}` : undefined} />
                      <CostTile label="Calls" value={usd(bill.calls)} note={`${Math.round(bill.callMinutes)} min`} />
                      <CostTile label="Recordings" value={usd(bill.recordings)} />
                      <CostTile label="Texts" value={usd(bill.texts)} note={bill.textCount ? `${bill.textCount} sent or received` : undefined} />
                      <CostTile label="Other" value={usd(bill.other)} />
                      <CostTile label="Twilio total" value={usd(bill.total)} strong />
                    </div>
                  </div>
                ) : null}

                {ai || aiBill !== undefined ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      AI (OpenAI)
                      {aiBill !== undefined ? (
                        <>
                          {' '}
                          · billed <span className="font-semibold text-foreground tabular-nums">{usd(aiBill)}</span>
                        </>
                      ) : null}
                      {ai ? (
                        <>
                          {' '}
                          · {ai.requests} requests · {fmtTokens(ai.tokens)} tokens{ai.audioMinutes >= 1 ? ` · ${Math.round(ai.audioMinutes)} min of audio` : ''}
                        </>
                      ) : null}
                    </p>
                    {ai ? (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[30rem] text-left text-xs">
                          <thead className="text-muted-foreground">
                            <tr>
                              <th className="py-1 pr-3 font-normal">Used for</th>
                              <th className="py-1 pr-3 font-normal">Requests</th>
                              <th className="py-1 pr-3 font-normal">Tokens in</th>
                              <th className="py-1 pr-3 font-normal">Tokens out</th>
                              <th className="py-1 font-normal">Audio</th>
                            </tr>
                          </thead>
                          <tbody className="tabular-nums">
                            {ai.rows.map((r) => (
                              <tr key={r.feature} className="border-t border-border/50">
                                <td className="py-1 pr-3">{r.label}</td>
                                <td className="py-1 pr-3">{r.requests}</td>
                                <td className="py-1 pr-3">{fmtTokens(r.inputTokens)}</td>
                                <td className="py-1 pr-3">{fmtTokens(r.outputTokens)}</td>
                                <td className="py-1">{r.audioMinutes >= 0.05 ? `${r.audioMinutes.toFixed(r.audioMinutes < 10 ? 1 : 0)} min` : '–'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {est ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Per person (estimate from the calls in the CRM)</p>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[34rem] text-left text-xs">
                        <thead className="text-muted-foreground">
                          <tr>
                            <th className="py-1 pr-3 font-normal"> </th>
                            <th className="py-1 pr-3 font-normal">Dials</th>
                            <th className="py-1 pr-3 font-normal">Answered</th>
                            <th className="py-1 pr-3 font-normal">Minutes</th>
                            <th className="py-1 pr-3 font-normal">Phone</th>
                            <th className="py-1 pr-3 font-normal">Recording</th>
                            <th className="py-1 pr-3 font-normal">AI</th>
                            <th className="py-1 font-normal">Total</th>
                          </tr>
                        </thead>
                        <tbody className="tabular-nums">
                          {[{ name: 'Everyone', row: est.all, bold: true }, ...est.perPerson.map((p) => ({ name: p.name, row: p.row, bold: false }))].map((r) => (
                            <tr key={r.name} className={r.bold ? 'border-t font-medium' : 'border-t border-border/50'}>
                              <td className="py-1 pr-3">{r.name}</td>
                              <td className="py-1 pr-3">{r.row.dials}</td>
                              <td className="py-1 pr-3">{r.row.answered}</td>
                              <td className="py-1 pr-3">{r.row.minutes}</td>
                              <td className="py-1 pr-3">{usd(r.row.phone)}</td>
                              <td className="py-1 pr-3">{usd(r.row.recording)}</td>
                              <td className="py-1 pr-3">{usd(r.row.ai)}</td>
                              <td className="py-1">{usd(r.row.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}

          {bills && !bills.ok ? <p className="text-xs text-amber-600 dark:text-amber-400">Couldn’t read the bill from Twilio: {bills.error}</p> : null}
          {!openaiBill.ok ? <p className="text-xs text-amber-600 dark:text-amber-400">Couldn’t read the OpenAI bill: {openaiBill.error}</p> : null}
          {openaiBill.ok && openaiBill.b === null ? (
            <p className="text-xs text-muted-foreground">
              To see the real OpenAI bill next to the token usage, add <code>OPENAI_ADMIN_KEY</code> in Vercel (OpenAI → Organization → Admin keys). Token usage is recorded from today; earlier months only have the estimate.
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Rates used, per minute: Israeli mobile {rateUsd(RATES.ilMobile)}, other Israeli numbers {rateUsd(RATES.ilOther)}, US {rateUsd(RATES.us)}, anywhere else about {rateUsd(RATES.otherCountry)}, plus {rateUsd(RATES.browserLeg)} for the browser line. Recording {rateUsd(RATES.recording)}. Each reviewed call:
            transcription {rateUsd(RATES.transcription)} a minute plus about {rateUsd(RATES.reviewPerCall)} for the review.{hints ? ` Live hints about ${rateUsd(RATES.liveHintsPerMinute)} a minute.` : ''} Only connected calls of 2 minutes or more are reviewed automatically. Minutes are rounded up per call.
          </p>
        </CardContent>
      </Card>

      {numbers?.length ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Incoming calls</CardTitle>
            <p className="text-sm text-muted-foreground">Calls to a number ring in the CRM for the person it’s assigned to (every CRM tab they have open). Unanswered after 25 seconds, the caller can leave a voicemail and a “Call back” task is created.</p>
          </CardHeader>
          <CardContent className="divide-y divide-border/60">
            {numbers.map((n) => {
              const owner = ownerOf.get(n.number)
              return (
                <IncomingRoutingRow
                  key={n.sid}
                  sid={n.sid}
                  number={n.number}
                  owner={owner ? (owner.name ?? owner.email ?? 'Teammate') : null}
                  routed={routedToCrm(n)}
                  canUndo={savedRouting.has(n.sid)}
                  elsewhere={n.voiceAppSid ? `a TwiML app (${n.voiceAppSid.slice(0, 8)}…)` : n.voiceUrl.replace(/^https?:\/\//, '').slice(0, 60)}
                />
              )
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recording</CardTitle>
        </CardHeader>
        <CardContent>
          <VoiceSettingsForm initial={{ record, hints, listenIn, countries, reviewModel }} listenReady={Boolean(listenRelay())} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Latest calls</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click a call for its recording, transcript and coaching.{' '}
            <Link href="/sales/calls" className="text-primary hover:underline">
              All calls and team scores →
            </Link>
          </p>
        </CardHeader>
        <CardContent>
          {calls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No calls yet.</p>
          ) : (
            <ul className="divide-y divide-border/60 text-sm">
              {calls.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                  <span className="w-40 shrink-0 text-xs text-muted-foreground">{formatDateTime(c.startedAt, me.timeZone)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{c.user ? (c.user.name ?? c.user.email) : 'Former teammate'}</span>
                    <span className="text-muted-foreground"> → </span>
                    {c.lead ? (
                      <Link href={`/sales/leads/${c.lead.id}`} className="hover:underline">
                        {leadName(c.lead)}
                      </Link>
                    ) : (
                      formatPhone(c.toNumber)
                    )}
                    {c.simulated ? <span className="ms-2 rounded bg-amber-500/15 px-1.5 text-[10px] text-amber-300">demo</span> : null}
                  </span>
                  <Link href={`/sales/calls/${c.id}`} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                    {STATUS[c.status] ?? c.status}
                    {c.durationSec ? ` · ${fmtDuration(c.durationSec)}` : ''}
                    {c.outcome ? ` · ${CALL_OUTCOMES[c.outcome as keyof typeof CALL_OUTCOMES] ?? c.outcome}` : ''}
                    {c.recordingSid ? ' · ▶ recording' : ''}
                    {c.analysisStatus === 'ready' ? ' · analyzed' : ''}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const NUMBER_TYPE: Record<NumberCost['type'], string> = { local: 'Local', mobile: 'Mobile', 'toll free': 'Toll-free', unknown: '–' }

function CostTile({ label, value, note, strong }: { label: string; value: string; note?: string; strong?: boolean }): React.ReactElement {
  return (
    <div className={strong ? 'rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5' : 'rounded-md border px-2.5 py-1.5'}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={strong ? 'font-semibold tabular-nums' : 'font-medium tabular-nums'}>{value}</p>
      {note ? <p className="text-[11px] text-muted-foreground">{note}</p> : null}
    </div>
  )
}
