import { MeetingCall, MeetingSyncTrigger, type MeetingCallView } from '@/components/crm/MeetingCall'
import { TeamMeetingForm } from '@/components/crm/TeamMeetingForm'
import { PageIntro } from '@/components/PageIntro'
import { requireUser } from '@/lib/auth'
import { formatDateTime } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Team meetings' }
export const dynamic = 'force-dynamic'

export default async function TeamMeetingsPage(): Promise<React.ReactElement> {
  const admin = await requireUser(['ADMIN'])
  const [me, rows, people] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: admin.id }, select: { timeZone: true } }),
    prisma.booking.findMany({ where: { source: 'TEAM_MEETING', status: { not: 'CANCELLED' } }, orderBy: { startTime: 'desc' }, take: 100, include: { host: { select: { name: true, email: true } }, meeting: true } }),
    prisma.user.findMany({ where: { id: { not: admin.id }, email: { not: null } }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }),
  ])
  const timeOnly = (d: Date): string => new Intl.DateTimeFormat('en-GB', { timeZone: me.timeZone, hour: '2-digit', minute: '2-digit' }).format(d)
  const view = (b: (typeof rows)[number]): MeetingCallView | null => {
    const m = b.meeting
    if (!m) return null
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
      timesUnknown: m.lastError === 'meet-scope-missing',
    }
  }
  return (
    <div className="space-y-6">
      <MeetingSyncTrigger everyMs={120_000} />
      <PageIntro title="Team meetings" hint="Internal calls with the team, with real start and end times, who joined, and the Gemini summary. Only admins can see this page." />
      <TeamMeetingForm people={people.map((p) => ({ id: p.id, label: p.name ?? p.email ?? p.id }))} />
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
    </div>
  )
}
