import { ConnectGoogleButton, UnverifiedAppHint } from '@/components/ConnectGoogle'
import { InviteForm } from '@/components/InviteForm'
import { PageIntro } from '@/components/PageIntro'
import { Card, CardContent } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { leadName } from '@/lib/format'
import { allowedTeammates } from '@/lib/bookings'
import { leadScope } from '@/lib/lead-access'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'
import { notArchivedBy } from '@/lib/lead-archive'

export const metadata = { title: 'Send meeting invite' }
export const dynamic = 'force-dynamic'

export default async function InvitePage(props: { searchParams: Promise<{ leadId?: string }> }): Promise<React.ReactElement> {
  const searchParams = await props.searchParams;
  const user = await requireUser(['ADMIN', 'SALES'])
  const select = { id: true, email: true, firstName: true, lastName: true, company: true } as const
  const [leads, preselected, hosts, googleConnected, defaultDuration, me] = await Promise.all([
    prisma.lead.findMany({
      where: { AND: [leadScope(user), { ...notArchivedBy(user.id), email: { not: null }, status: { notIn: ['WON', 'LOST'] } }] },
      orderBy: { updatedAt: 'desc' },
      take: 300,
      select,
    }),
    typeof searchParams.leadId === 'string' ? prisma.lead.findFirst({ where: { AND: [leadScope(user), { id: searchParams.leadId, email: { not: null } }] }, select }) : null,
    user.role === 'ADMIN' ? prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SALES'] } }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }) : Promise.resolve([]),
    prisma.account.findFirst({ where: { userId: user.id, provider: 'google', refresh_token: { not: null } }, select: { id: true } }),
    getSetting('booking.defaultDurationMinutes'),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } }),
  ])
  const teammates = await allowedTeammates(user, user.id)
  const all = preselected && !leads.some((l) => l.id === preselected.id) ? [preselected, ...leads] : leads
  return (
    <div className="space-y-5">
      <PageIntro
        title="Send meeting invite"
        hint="Choose any date and time. The guest gets a branded email with one button to confirm; the Google Meet link is created the moment they accept."
      />
      {!googleConnected ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm">
          <span>
            Connect Google so invites get a Meet link and the times skip what&apos;s busy on your calendar. Until you do, you can&apos;t send invites.
            <UnverifiedAppHint />
          </span>
          <ConnectGoogleButton callbackUrl="/sales/invite" />
        </div>
      ) : null}
      <Card>
        <CardContent className="pt-[var(--card-pad)]">
          <InviteForm
            defaultDuration={defaultDuration}
            leads={all.map((l) => ({ id: l.id, email: l.email ?? '', name: leadName(l), company: l.company }))}
            initialLeadId={preselected?.id}
            hosts={hosts.map((h) => ({ id: h.id, label: h.id === user.id ? `${h.name ?? h.email} (me)` : (h.name ?? h.email ?? h.id) }))}
            currentUserId={user.id}
            teammates={teammates.map((t) => ({ id: t.id, label: t.name ?? t.email }))}
            teammatesAreAdminsOnly={user.role !== 'ADMIN'}
            timeZone={me.timeZone}
          />
        </CardContent>
      </Card>
    </div>
  )
}
