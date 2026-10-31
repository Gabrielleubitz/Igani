import { DangerButton } from '../_components/DangerButton'
import { deleteBookingPage } from '@/app/actions/admin'
import { BookingPageForm } from '@/components/admin/forms'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { appUrl } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'

export const metadata = { title: 'Booking pages' }

export default async function BookingPagesPage(): Promise<React.ReactElement> {
  const [pages, hosts] = await Promise.all([
    prisma.bookingPage.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SALES'] } }, select: { id: true, name: true, email: true } }),
  ])
  const hostOptions = hosts.map((h) => ({ id: h.id, label: h.name ?? h.email ?? h.id }))
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Booking pages</h1>
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">+ New page</summary>
          <div className="absolute right-0 z-20 mt-2 w-[min(92vw,40rem)] rounded-lg border bg-card p-4 shadow-lg">
            {hostOptions.length ? <BookingPageForm hosts={hostOptions} defaultDuration={await getSetting('booking.defaultDurationMinutes')} /> : <p className="text-sm text-muted-foreground">A SALES or ADMIN user must sign in first.</p>}
          </div>
        </details>
      </div>
      {pages.length === 0 ? <p className="text-sm text-muted-foreground">No booking pages yet.</p> : null}
      {pages.map((p) => (
        <Card key={p.id}>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle>
              <a href={appUrl(`/book/${p.slug}`)} className="underline underline-offset-4" target="_blank" rel="noreferrer">
                /book/{p.slug}
              </a>
            </CardTitle>
            <span className="text-xs text-muted-foreground">{p.title}{p.active ? '' : ' · inactive'}</span>
          </CardHeader>
          <CardContent>
            <details>
            <summary className="mb-3 cursor-pointer select-none text-sm text-muted-foreground">Edit page</summary>
            <BookingPageForm
              hosts={hostOptions}
              initial={{
                slug: p.slug,
                title: p.title,
                description: p.description ?? '',
                durationMinutes: p.durationMinutes,
                requiresApproval: p.requiresApproval,
                active: p.active,
                hostId: p.hostId,
              }}
            />
            <div className="mt-3">
              <DangerButton label="Delete page" confirm={`Delete /book/${p.slug}? Existing bookings are kept.`} action={async () => { 'use server'; return deleteBookingPage(p.id) }} />
            </div>
            </details>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
