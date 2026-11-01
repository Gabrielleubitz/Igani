import { TeamMeetingsPanel } from '@/components/crm/TeamMeetingsPanel'
import { ConnectGoogleButton, UnverifiedAppHint } from '@/components/ConnectGoogle'
import { PageIntro } from '@/components/PageIntro'
import { TeamMeetingForm } from '@/components/TeamMeetingForm'
import { Card, CardContent } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { allowedTeammates } from '@/lib/bookings'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'

export const metadata = { title: 'Book meeting with team' }
export const dynamic = 'force-dynamic'

export default async function TeamMeetingPage(): Promise<React.ReactElement> {
  const user = await requireUser(['ADMIN', 'SALES'])
  const [teammates, googleConnected, defaultDuration, me] = await Promise.all([
    allowedTeammates(user, user.id),
    prisma.account.findFirst({ where: { userId: user.id, provider: 'google', refresh_token: { not: null } }, select: { id: true } }),
    getSetting('booking.defaultDurationMinutes'),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } }),
  ])
  return (
    <div className="space-y-5">
      <PageIntro title="Book meeting with team" hint={user.role === 'ADMIN' ? 'An internal call with teammates. Choose who and when; they get the Google Meet link by email straight away, with nothing to approve.' : 'Ask an admin for a call. Choose who and when; the time is held and they approve it before the Google Meet is created.'} />
      {user.role !== 'ADMIN' && !googleConnected ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm">
          <span>
            Connect Google so the call gets a Meet link and your calendar is checked for clashes.
            <UnverifiedAppHint />
          </span>
          <ConnectGoogleButton callbackUrl="/sales/team-meeting" />
        </div>
      ) : null}
      {teammates.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">There is nobody you can add yet.</p>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <TeamMeetingForm teammates={teammates.map((t) => ({ id: t.id, label: t.name ?? t.email }))} adminsOnly={user.role !== 'ADMIN'} defaultDuration={defaultDuration} timeZone={me.timeZone} />
          </CardContent>
        </Card>
      )}
      {user.role === 'ADMIN' ? <TeamMeetingsPanel adminId={user.id} /> : null}
    </div>
  )
}
