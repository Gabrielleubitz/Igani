import { BookingActions } from '@/components/CancelBookingButton'
import { Badge } from '@/components/ui/badge'
import { requireUser } from '@/lib/auth'
import { formatDateTime } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Bookings' }

export default async function BookingsPage(): Promise<React.ReactElement> {
  const admin = await requireUser(['ADMIN'])
  const me = await prisma.user.findUniqueOrThrow({ where: { id: admin.id }, select: { timeZone: true } })
  const [pending, recent] = await Promise.all([
    prisma.booking.findMany({
      where: { status: 'PENDING', source: 'PUBLIC_PAGE', startTime: { gt: new Date() } },
      orderBy: { startTime: 'asc' },
      include: { host: { select: { name: true } }, bookingPage: { select: { slug: true } } },
    }),
    prisma.booking.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { host: { select: { name: true } } } }),
  ])
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Bookings</h1>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Awaiting approval ({pending.length})</h2>
        {pending.length === 0 ? <p className="text-sm text-muted-foreground">Nothing to approve.</p> : null}
        <div className="divide-y rounded-lg border">
          {pending.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div>
                <div className="font-medium">
                  {b.guestName} <span className="text-muted-foreground">({b.guestEmail})</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {b.title} · {formatDateTime(b.startTime, me.timeZone)} · host {b.host.name ?? '—'} · /book/{b.bookingPage?.slug}
                </div>
                {b.notes ? <div className="mt-1 text-xs">{b.notes}</div> : null}
              </div>
              <BookingActions bookingId={b.id} canApprove />
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent bookings</h2>
        <div className="divide-y rounded-lg border text-sm">
          {recent.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <span>
                {formatDateTime(b.startTime, me.timeZone)} — {b.guestName} with {b.host.name ?? '—'}{' '}
                <span className="text-muted-foreground">({b.source === 'PUBLIC_PAGE' ? 'public' : 'sales invite'})</span>
              </span>
              <Badge variant={b.status === 'CONFIRMED' ? 'default' : b.status === 'PENDING' ? 'secondary' : 'outline'}>{b.status}</Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
