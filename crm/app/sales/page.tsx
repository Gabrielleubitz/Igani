import type { Prisma } from '@prisma/client'
import Link from 'next/link'
import { BookingActions } from '@/components/CancelBookingButton'
import { LeadControls } from '@/components/LeadControls'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { LEAD_STATUSES, formatDateTime, leadName } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Pipeline' }

export default async function PipelinePage(): Promise<React.ReactElement> {
  const user = await requireUser()
  const isAdmin = user.role === 'ADMIN'
  const scope: Prisma.LeadWhereInput = isAdmin ? {} : { OR: [{ assignedToId: user.id }, { assignedToId: null }] }

  const [leads, reps, bookings, me] = await Promise.all([
    prisma.lead.findMany({
      where: scope,
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { assignedTo: { select: { name: true, email: true } } },
    }),
    prisma.user.findMany({ where: { role: { in: ['SALES', 'ADMIN'] } }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }),
    prisma.booking.findMany({
      where: { status: { in: ['PENDING', 'CONFIRMED'] }, endTime: { gte: new Date() }, ...(isAdmin ? {} : { hostId: user.id }) },
      orderBy: { startTime: 'asc' },
      take: 50,
      include: { host: { select: { name: true } } },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } }),
  ])
  const repOptions = reps.map((r) => ({ id: r.id, label: r.name ?? r.email ?? r.id }))

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Lead pipeline</h1>
        <Link href="/sales/invite" className="text-sm underline underline-offset-4">
          Send a meeting invite →
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming meetings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bookings.length === 0 ? <p className="text-sm text-muted-foreground">No upcoming meetings.</p> : null}
          {bookings.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-0">
              <div>
                <div className="font-medium">
                  {b.title} — {b.guestName} <span className="text-muted-foreground">({b.guestEmail})</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDateTime(b.startTime, me.timeZone)} · host {b.host.name ?? '—'}
                  {b.meetUrl ? (
                    <>
                      {' · '}
                      <a href={b.meetUrl} className="underline" target="_blank" rel="noreferrer">
                        Meet
                      </a>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={b.status === 'CONFIRMED' ? 'default' : 'secondary'}>{b.status}</Badge>
                <BookingActions bookingId={b.id} canApprove={false} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {LEAD_STATUSES.map((status) => {
        const inStage = leads.filter((l) => l.status === status)
        return (
          <section key={status} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {status.replace('_', ' ')} <span className="ml-1">({inStage.length})</span>
            </h2>
            {inStage.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : null}
            <div className="divide-y rounded-lg border">
              {inStage.map((l) => (
                <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {leadName(l)} {l.company ? <span className="text-muted-foreground">· {l.company}</span> : null}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {l.email} · {l.source}
                      {l.utmCampaign ? ` · ${l.utmCampaign}` : ''}
                      {l.budget ? ` · budget ${l.budget}` : ''} · {l.assignedTo ? `owner ${l.assignedTo.name ?? l.assignedTo.email}` : 'unassigned'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <LeadControls
                      leadId={l.id}
                      status={l.status}
                      assignedToId={l.assignedToId}
                      currentUserId={user.id}
                      isAdmin={isAdmin}
                      reps={repOptions}
                    />
                    <Link href={`/sales/invite?leadId=${l.id}`} className="text-xs underline underline-offset-4">
                      Invite
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
