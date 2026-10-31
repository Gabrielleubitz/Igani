import Link from 'next/link'
import { BookingActions } from '@/components/CancelBookingButton'
import { PageIntro } from '@/components/PageIntro'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { formatDateTime } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Bookings' }
export const dynamic = 'force-dynamic'

const FILTERS = [
  ['all', 'All'],
  ['upcoming', 'Upcoming'],
  ['CONFIRMED', 'Confirmed'],
  ['PENDING', 'Pending'],
  ['CANCELLED', 'Cancelled'],
] as const

export default async function BookingsPage({ searchParams }: { searchParams: { filter?: string } }): Promise<React.ReactElement> {
  const admin = await requireUser(['ADMIN'])
  const filter = FILTERS.find(([k]) => k === searchParams.filter)?.[0] ?? 'all'
  const now = new Date()
  const me = await prisma.user.findUniqueOrThrow({ where: { id: admin.id }, select: { timeZone: true } })
  const [pending, recent] = await Promise.all([
    prisma.booking.findMany({
      where: { status: 'PENDING', source: 'PUBLIC_PAGE', startTime: { gt: now } },
      orderBy: { startTime: 'asc' },
      include: { host: { select: { name: true } }, bookingPage: { select: { slug: true } } },
    }),
    prisma.booking.findMany({
      where:
        filter === 'upcoming'
          ? { status: { in: ['PENDING', 'CONFIRMED'] }, endTime: { gte: now } }
          : filter === 'all'
            ? {}
            : { status: filter },
      orderBy: filter === 'upcoming' ? { startTime: 'asc' } : { createdAt: 'desc' },
      take: 100,
      include: { host: { select: { name: true, email: true } } },
    }),
  ])
  return (
    <div className="space-y-8">
      <PageIntro title="Bookings" hint="Approve requests from booking pages that need review, and see every meeting booked through the CRM." />
      <Card className={pending.length ? 'border-amber-500/40' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Awaiting your approval <span className="text-sm font-normal text-muted-foreground">({pending.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? <p className="text-sm text-muted-foreground">Nothing to approve. 🎉</p> : null}
          <div className="divide-y">
            {pending.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="font-medium">
                    {b.guestName} <span className="font-normal text-muted-foreground">({b.guestEmail})</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {b.title} · {formatDateTime(b.startTime, me.timeZone)} · host {b.host.name ?? '—'}
                    {b.bookingPage ? ` · /book/${b.bookingPage.slug}` : ''}
                  </div>
                  {b.notes ? <p className="mt-1 whitespace-pre-wrap rounded border bg-background/40 px-2 py-1 text-xs">{b.notes}</p> : null}
                </div>
                <BookingActions bookingId={b.id} canApprove guestName={b.guestName} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">All bookings</h2>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map(([k, label]) => (
              <Link key={k} href={k === 'all' ? '/admin/bookings' : `/admin/bookings?filter=${k}`} className={`rounded-full border px-3 py-1 text-sm ${filter === k ? 'border-primary/50 bg-primary/15 font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Guest</th>
                <th className="px-3 py-2 font-medium">Host</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {recent.map((b) => (
                <tr key={b.id} className="hover:bg-muted/20">
                  <td className="whitespace-nowrap px-3 py-2">{formatDateTime(b.startTime, me.timeZone)}</td>
                  <td className="px-3 py-2">
                    {b.leadId ? (
                      <Link href={`/sales/leads/${b.leadId}`} className="font-medium underline-offset-4 hover:underline">
                        {b.guestName}
                      </Link>
                    ) : (
                      <span className="font-medium">{b.guestName}</span>
                    )}
                    <div className="text-xs text-muted-foreground">{b.guestEmail}</div>
                  </td>
                  <td className="px-3 py-2">{b.host.name ?? b.host.email}</td>
                  <td className="px-3 py-2 text-muted-foreground">{b.source === 'PUBLIC_PAGE' ? 'Booking page' : 'Sales invite'}</td>
                  <td className="px-3 py-2">
                    <Badge variant={b.status === 'CONFIRMED' ? 'success' : b.status === 'PENDING' ? 'warning' : 'outline'}>{b.status === 'CONFIRMED' ? (b.endTime < now ? 'Held' : 'Confirmed') : b.status === 'PENDING' ? 'Pending' : 'Cancelled'}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {b.meetUrl && b.status === 'CONFIRMED' && b.endTime >= now ? (
                      <a href={b.meetUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline-offset-4 hover:underline">
                        Meet link
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recent.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No bookings here yet.</p> : null}
        </div>
      </section>
    </div>
  )
}
