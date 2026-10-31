import Link from 'next/link'
import { BookingActions } from '@/components/CancelBookingButton'
import { PageIntro } from '@/components/PageIntro'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { requireUser } from '@/lib/auth'
import { formatDateTime } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Meetings' }
export const dynamic = 'force-dynamic'

export default async function MeetingsPage({ searchParams }: { searchParams: { view?: string } }): Promise<React.ReactElement> {
  const user = await requireUser(['ADMIN', 'SALES'])
  const isAdmin = user.role === 'ADMIN'
  const now = new Date()
  const past = searchParams.view === 'past'
  const host = isAdmin ? {} : { hostId: user.id }
  const [bookings, me] = await Promise.all([
    prisma.booking.findMany({
      where: past
        ? { ...host, OR: [{ endTime: { lt: now } }, { status: 'CANCELLED', startTime: { gte: new Date(now.getTime() - 90 * 864e5) } }], startTime: { gte: new Date(now.getTime() - 90 * 864e5) } }
        : { ...host, status: { in: ['PENDING', 'CONFIRMED'] }, endTime: { gte: now } },
      orderBy: { startTime: past ? 'desc' : 'asc' },
      take: 100,
      include: { host: { select: { name: true, email: true } }, lead: { select: { id: true } } },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } }),
  ])
  const dayKey = (d: Date): string => new Intl.DateTimeFormat('en-US', { timeZone: me.timeZone, weekday: 'long', month: 'long', day: 'numeric' }).format(d)
  const days = new Map<string, typeof bookings>()
  for (const b of bookings) days.set(dayKey(b.startTime), [...(days.get(dayKey(b.startTime)) ?? []), b])
  const time = (d: Date): string => new Intl.DateTimeFormat('en-US', { timeZone: me.timeZone, hour: 'numeric', minute: '2-digit' }).format(d)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageIntro title="Meetings" hint={isAdmin ? 'Every meeting on the team calendar. Cancel one and the guest can be emailed automatically.' : 'Your meetings. Invites stay “awaiting guest” until the person confirms.'} />
        <Link href="/sales/invite" className={buttonVariants()}>
          + Send meeting invite
        </Link>
      </div>
      <div className="flex gap-2">
        <Link href="/sales" className={`rounded-full border px-3 py-1 text-sm ${!past ? 'border-primary/50 bg-primary/15 font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
          Upcoming
        </Link>
        <Link href="/sales?view=past" className={`rounded-full border px-3 py-1 text-sm ${past ? 'border-primary/50 bg-primary/15 font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
          Past &amp; cancelled
        </Link>
      </div>
      {bookings.length === 0 ? (
        <EmptyState
          title={past ? 'No past meetings in the last 90 days' : 'No upcoming meetings'}
          description={past ? undefined : 'Send an invite to a contact, or share your booking page.'}
          action={
            !past ? (
              <Link href="/sales/invite" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                Send an invite
              </Link>
            ) : undefined
          }
        />
      ) : null}
      {[...days].map(([day, list]) => (
        <Card key={day}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{day}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {list.map((b) => {
              const live = b.status === 'CONFIRMED' && b.startTime <= now && b.endTime >= now
              return (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="w-20 shrink-0 text-sm tabular-nums">
                      <div className="font-medium">{time(b.startTime)}</div>
                      <div className="text-xs text-muted-foreground">{time(b.endTime)}</div>
                    </div>
                    <div className="min-w-0">
                      <div className={`font-medium ${b.status === 'CANCELLED' ? 'text-muted-foreground line-through' : ''}`}>
                        {b.title} · {b.lead ? <Link href={`/sales/leads/${b.lead.id}`} className="underline-offset-4 hover:underline">{b.guestName}</Link> : b.guestName}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {b.guestEmail}
                        {isAdmin ? ` · host ${b.host.name ?? b.host.email}` : ''} · {b.source === 'PUBLIC_PAGE' ? 'booked online' : 'sales invite'}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {live ? <Badge variant="success">Live now</Badge> : null}
                    <Badge variant={b.status === 'CONFIRMED' ? (b.endTime < now ? 'secondary' : 'success') : b.status === 'PENDING' ? 'warning' : 'outline'}>
                      {b.status === 'CONFIRMED' ? (b.endTime < now ? 'Held' : 'Confirmed') : b.status === 'PENDING' ? (b.source === 'PUBLIC_PAGE' ? 'Needs approval' : 'Awaiting guest') : 'Cancelled'}
                    </Badge>
                    {b.meetUrl && b.status === 'CONFIRMED' && b.endTime >= now ? (
                      <a href={b.meetUrl} target="_blank" rel="noreferrer" className={buttonVariants({ size: 'sm' })}>
                        Join Meet
                      </a>
                    ) : null}
                    {b.status !== 'CANCELLED' && b.endTime >= now ? <BookingActions bookingId={b.id} canApprove={isAdmin && b.status === 'PENDING' && b.source === 'PUBLIC_PAGE'} guestName={b.guestName} /> : null}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
