import { DangerButton } from '../_components/DangerButton'
import { deleteBookingPage } from '@/app/actions/admin'
import { BookingPageForm } from '@/components/admin/forms'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { appUrl } from '@/lib/env'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Booking pages' }

export default async function BookingPagesPage(): Promise<React.ReactElement> {
  const [pages, hosts] = await Promise.all([
    prisma.bookingPage.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SALES'] } }, select: { id: true, name: true, email: true } }),
  ])
  const hostOptions = hosts.map((h) => ({ id: h.id, label: h.name ?? h.email ?? h.id }))
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Public booking pages</h1>
      <Card>
        <CardHeader>
          <CardTitle>New page</CardTitle>
        </CardHeader>
        <CardContent>
          {hostOptions.length ? <BookingPageForm hosts={hostOptions} /> : <p className="text-sm text-muted-foreground">A SALES or ADMIN user must sign in first.</p>}
        </CardContent>
      </Card>
      {pages.map((p) => (
        <Card key={p.id}>
          <CardHeader>
            <CardTitle>
              <a href={appUrl(`/book/${p.slug}`)} className="underline underline-offset-4" target="_blank" rel="noreferrer">
                /book/{p.slug}
              </a>
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
