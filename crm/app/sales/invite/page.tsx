import { InviteForm } from '@/components/InviteForm'
import { requireUser } from '@/lib/auth'
import { leadName } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'

export const metadata = { title: 'Send invite' }

export default async function InvitePage({ searchParams }: { searchParams: { leadId?: string } }): Promise<React.ReactElement> {
  const user = await requireUser(['ADMIN', 'SALES'])
  const leads = await prisma.lead.findMany({
    where: {
      status: { notIn: ['WON', 'LOST'] },
      ...(user.role === 'ADMIN' ? {} : { OR: [{ assignedToId: user.id }, { assignedToId: null }] }),
    },
    orderBy: { updatedAt: 'desc' },
    take: 300,
    select: { id: true, email: true, firstName: true, lastName: true },
  })
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Send invite</h1>
        <p className="text-sm text-muted-foreground">
          Pick a free slot from your calendar. The guest gets an email to confirm; a Google Meet is created when they accept.
        </p>
      </div>
      <InviteForm
        defaultDuration={await getSetting('booking.defaultDurationMinutes')}
        leads={leads.map((l) => ({ id: l.id, email: l.email, name: leadName(l) }))}
        initialLeadId={typeof searchParams.leadId === 'string' ? searchParams.leadId : undefined}
      />
    </div>
  )
}
