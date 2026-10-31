import Link from 'next/link'
import { InviteForm } from '@/components/InviteForm'
import { PageIntro } from '@/components/PageIntro'
import { Card, CardContent } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { leadName } from '@/lib/format'
import { leadScope } from '@/lib/lead-access'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'

export const metadata = { title: 'Send meeting invite' }
export const dynamic = 'force-dynamic'

export default async function InvitePage({ searchParams }: { searchParams: { leadId?: string } }): Promise<React.ReactElement> {
  const user = await requireUser(['ADMIN', 'SALES'])
  const select = { id: true, email: true, firstName: true, lastName: true, company: true } as const
  const [leads, preselected, hosts, myRules, defaultDuration] = await Promise.all([
    prisma.lead.findMany({
      where: { AND: [leadScope(user), { archived: false, status: { notIn: ['WON', 'LOST'] } }] },
      orderBy: { updatedAt: 'desc' },
      take: 300,
      select,
    }),
    typeof searchParams.leadId === 'string' ? prisma.lead.findFirst({ where: { AND: [leadScope(user), { id: searchParams.leadId }] }, select }) : null,
    user.role === 'ADMIN' ? prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SALES'] } }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }) : Promise.resolve([]),
    prisma.availability.count({ where: { hostId: user.id } }),
    getSetting('booking.defaultDurationMinutes'),
  ])
  const all = preselected && !leads.some((l) => l.id === preselected.id) ? [preselected, ...leads] : leads
  return (
    <div className="space-y-5">
      <PageIntro
        title="Send meeting invite"
        hint="Pick a free slot from the calendar. The guest gets a branded email with one button to confirm; the Google Meet link is created the moment they accept."
      />
      {myRules === 0 ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          You haven&apos;t set your working hours yet, so no times will show.{' '}
          <Link href="/sales/availability" className="font-medium underline underline-offset-4">
            Set my hours →
          </Link>
        </p>
      ) : null}
      <Card>
        <CardContent className="pt-6">
          <InviteForm
            defaultDuration={defaultDuration}
            leads={all.map((l) => ({ id: l.id, email: l.email, name: leadName(l), company: l.company }))}
            initialLeadId={preselected?.id}
            hosts={hosts.map((h) => ({ id: h.id, label: h.id === user.id ? `${h.name ?? h.email} (me)` : (h.name ?? h.email ?? h.id) }))}
            currentUserId={user.id}
          />
        </CardContent>
      </Card>
    </div>
  )
}
