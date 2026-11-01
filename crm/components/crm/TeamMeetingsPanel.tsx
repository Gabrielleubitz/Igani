import { aiTidyEnabled } from '@/lib/meeting-ai'
import { dedupeCalls } from '@/lib/meet-notes'
import { organizedFor } from '@/lib/organize-notes'
import { ConnectGoogleButton, UnverifiedAppHint } from '@/components/ConnectGoogle'
import { MeetingCall, MeetingSyncTrigger, type MeetingCallView } from '@/components/crm/MeetingCall'
import { ImportTeamCalls } from '@/components/crm/ImportTeamCalls'
import { formatDateTime } from '@/lib/format'
import { googleGrants } from '@/lib/google'
import { prisma } from '@/lib/prisma'

async function load(adminId: string) {
  // Calls booked here (an activity-log tag) and calls imported from Google Calendar / Meet.
  const tagged = await prisma.activityLog.findMany({ where: { entityType: 'BOOKING', action: 'booking.team_meeting' }, select: { entityId: true }, take: 500, orderBy: { createdAt: 'desc' } })
  const [grants, me, rows] = await Promise.all([
    googleGrants(adminId),
    prisma.user.findUniqueOrThrow({ where: { id: adminId }, select: { timeZone: true } }),
    prisma.booking.findMany({ where: { OR: [{ source: 'TEAM_MEETING' }, { id: { in: tagged.map((t) => t.entityId) } }], status: { not: 'CANCELLED' } }, orderBy: { startTime: 'desc' }, take: 100, include: { host: { select: { name: true, email: true } }, meeting: true } }),
  ])
  return { grants, me, rows: dedupeCalls(rows) }
}

/** Admin-only block under the booking form: Google status, import, and every team call with its real times and Gemini notes. */
export async function TeamMeetingsPanel({ adminId }: { adminId: string }): Promise<React.ReactElement> {
  const admin = { id: adminId }
  let data: Awaited<ReturnType<typeof load>>
  try {
    data = await load(admin.id)
  } catch (err) {
    // A failing query (e.g. a pending database migration) must not take the whole booking page down.
    console.error('[team-meetings] panel failed', err instanceof Error ? err.message : err)
    return (
      <section className="space-y-2 border-t pt-6">
        <h2 className="text-base font-semibold">Tracked team meetings</h2>
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm">Could not load tracked meetings right now. Booking above still works. Reload in a minute, or ask an engineer to check the database migrations.</p>
      </section>
    )
  }
  const { grants, me, rows } = data
  const timeOnly = (d: Date): string => new Intl.DateTimeFormat('en-GB', { timeZone: me.timeZone, hour: '2-digit', minute: '2-digit' }).format(d)
  const view = (b: (typeof rows)[number]): MeetingCallView | null => {
    const m = b.meeting
    if (!m) return null
    try {
      return {
        bookingId: b.id,
        status: m.status,
        started: m.actualStart ? timeOnly(m.actualStart) : null,
        ended: m.actualEnd ? timeOnly(m.actualEnd) : null,
        minutes: m.actualStart && m.actualEnd ? Math.round((m.actualEnd.getTime() - m.actualStart.getTime()) / 60_000) : null,
        people: Array.isArray(m.participants) ? (m.participants as { name?: string }[]).map((p) => p.name ?? 'Guest') : [],
        notesStatus: m.notesStatus,
        docUrl: m.docUrl,
        summary: m.summaryText,
        nextSteps: m.nextStepsText,
        fullText: m.fullText,
        ...organizedFor(m),
        canTidy: aiTidyEnabled(),
        timesUnknown: m.lastError === 'meet-scope-missing',
      }
    } catch (err) {
      // One malformed meeting row must not take the page down: show the call without its notes.
      console.error('[team-meetings] bad meeting row', b.id, err instanceof Error ? err.message : err)
      return null
    }
  }
  return (
    <section className="space-y-4 border-t pt-6">
      <MeetingSyncTrigger everyMs={120_000} />
      <div>
        <h2 className="text-base font-semibold">Tracked team meetings</h2>
        <p className="text-sm text-muted-foreground">Real start and end times, who joined, and the Gemini summary. Only admins can see this.</p>
      </div>
      {!(grants.connected && grants.meet && grants.docs && grants.gmail) ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm">
          <span>
            {grants.connected ? 'Your Google is connected but is missing the Meet, Docs or Gmail permission' : 'Google is not connected yet'}. Signing in does not ask for these. Click Connect Google and tick every box, or Import and the Gemini notes cannot work.
            <UnverifiedAppHint />
          </span>
          <ConnectGoogleButton callbackUrl="/sales/team-meeting" label={grants.connected ? 'Reconnect Google' : 'Connect Google'} />
        </div>
      ) : null}
      <ImportTeamCalls />
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No team meetings yet. Book one above, or import a recent call from your Google Calendar.</p> : null}
      <div className="space-y-3">
        {rows.map((b) => {
          const call = view(b)
          const invited = Array.isArray(b.attendees) ? (b.attendees as string[]) : []
          return (
            <div key={b.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{b.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(b.startTime, me.timeZone)} · host {b.host.name ?? b.host.email}
                    {invited.length ? ` · ${invited.length} invited` : ''}
                  </div>
                </div>
                {b.meetUrl ? (
                  <a href={b.meetUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline-offset-4 hover:underline">
                    Join Meet
                  </a>
                ) : null}
              </div>
              {call ? <MeetingCall m={call} /> : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
