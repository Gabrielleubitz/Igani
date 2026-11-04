import { CheckCircle2, Circle } from 'lucide-react'
import Link from 'next/link'
import { PhoneLineRow, VoiceSettingsForm, type TwilioNumber } from '@/components/admin/PhoneAdmin'
import { PageIntro } from '@/components/PageIntro'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { CALL_OUTCOMES, fmtDuration } from '@/lib/calls'
import { formatDateTime, leadName } from '@/lib/format'
import { formatPhone } from '@/lib/phone-numbers'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'
import { dialerDemo, listTwilioNumbers, twilioConfig, twilioSetup } from '@/lib/twilio'

export const metadata = { title: 'Phone' }
export const dynamic = 'force-dynamic'

const STATUS: Record<string, string> = { INITIATED: 'Starting', RINGING: 'Ringing', IN_PROGRESS: 'On the call', COMPLETED: 'Answered', BUSY: 'Busy', NO_ANSWER: 'No answer', FAILED: 'Failed', CANCELED: 'Hung up' }

/** Admin → Phone: Twilio setup, a number per teammate, recording settings, and the latest calls. */
export default async function PhoneAdminPage(): Promise<React.ReactElement> {
  const admin = await requireUser(['ADMIN'])
  const config = twilioConfig()
  let numbers: TwilioNumber[] | null = null
  let numbersError: string | null = null
  if (config) {
    try {
      numbers = (await listTwilioNumbers(config)).filter((n) => n.voice)
    } catch (err) {
      numbersError = err instanceof Error ? err.message.slice(0, 200) : 'Could not read numbers from Twilio.'
    }
  }
  const [team, lines, record, consent, countries, calls, me] = await Promise.all([
    prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SALES'] } }, select: { id: true, name: true, email: true, role: true }, orderBy: { name: 'asc' } }),
    prisma.phoneLine.findMany({ select: { userId: true, number: true, active: true } }),
    getSetting('voice.record'),
    getSetting('voice.consentMessage'),
    getSetting('voice.countries'),
    prisma.call.findMany({ orderBy: { startedAt: 'desc' }, take: 25, include: { user: { select: { name: true, email: true } }, lead: { select: { id: true, firstName: true, lastName: true, email: true } } } }),
    prisma.user.findUniqueOrThrow({ where: { id: admin.id }, select: { timeZone: true } }),
  ])
  const lineOf = new Map(lines.map((l) => [l.userId, l]))
  const takenBy = Object.fromEntries(lines.map((l) => [l.number, l.userId]))
  const setup = twilioSetup()
  const ready = Boolean(config)

  return (
    <div className="space-y-5">
      <PageIntro title="Phone" hint="Calls from inside the CRM: each teammate calls from their own Twilio number, and every call lands on the contact’s timeline." />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{ready ? 'Twilio is connected' : 'Connect Twilio'}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {ready ? 'Calls go through your Twilio account.' : dialerDemo() ? 'Not connected yet. While developing, the dialer runs in demo mode (no real calls).' : 'Not connected yet. Add these in Vercel → CRM project → Environment Variables, then redeploy.'}
          </p>
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
          <CardTitle className="text-base">Recording</CardTitle>
        </CardHeader>
        <CardContent>
          <VoiceSettingsForm initial={{ record, consent, countries }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Latest calls</CardTitle>
          <p className="text-sm text-muted-foreground">Recordings, transcripts and coaching come with the CallMap step.</p>
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
                    <span className="font-medium">{c.user.name ?? c.user.email}</span>
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
                  <span className="text-xs text-muted-foreground">
                    {STATUS[c.status] ?? c.status}
                    {c.durationSec ? ` · ${fmtDuration(c.durationSec)}` : ''}
                    {c.outcome ? ` · ${CALL_OUTCOMES[c.outcome as keyof typeof CALL_OUTCOMES] ?? c.outcome}` : ''}
                    {c.recordingSid ? ' · recorded' : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
