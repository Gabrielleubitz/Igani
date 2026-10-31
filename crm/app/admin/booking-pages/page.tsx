import { DangerButton } from '../_components/DangerButton'
import { deleteBookingPage } from '@/app/actions/admin'
import { BookingPageForm } from '@/components/admin/forms'
import { PageIntro } from '@/components/PageIntro'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Popover } from '@/components/ui/popover'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { CopyButton } from '@/components/ui/copy-button'
import { EmptyState } from '@/components/ui/empty-state'
import { appUrl } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'

export const metadata = { title: 'Booking pages' }
export const dynamic = 'force-dynamic'

export default async function BookingPagesPage(): Promise<React.ReactElement> {
  const [pages, hosts, defaultDuration] = await Promise.all([
    prisma.bookingPage.findMany({ orderBy: { createdAt: 'asc' }, include: { host: { select: { name: true, email: true, availability: { select: { id: true } } } }, _count: { select: { bookings: true } } } }),
    prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SALES'] } }, select: { id: true, name: true, email: true } }),
    getSetting('booking.defaultDurationMinutes'),
  ])
  const hostOptions = hosts.map((h) => ({ id: h.id, label: h.name ?? h.email ?? h.id }))
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageIntro title="Booking pages" hint="Public links where anyone can book a meeting, e.g. on your website or email signature. Each booking lands in the CRM as a contact." />
        <Popover label="+ New page" panelClassName="w-[min(92vw,40rem)]">
            {hostOptions.length ? <BookingPageForm hosts={hostOptions} defaultDuration={defaultDuration} /> : <p className="text-sm text-muted-foreground">A sales or admin teammate must sign in once before they can host a page.</p>}
          </Popover>
      </div>
      {pages.length === 0 ? <EmptyState title="No booking pages yet" description="Create one, then share its link anywhere people should be able to book a call with you." /> : null}
      {pages.map((p) => {
        const url = appUrl(`/book/${p.slug}`)
        return (
          <Card key={p.id}>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{p.title}</h2>
                  <Badge variant={p.active ? 'success' : 'outline'}>{p.active ? 'Live' : 'Off'}</Badge>
                  {p.requiresApproval ? <Badge variant="warning">Needs approval</Badge> : null}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {p.durationMinutes} min · host {p.host.name ?? p.host.email} · {p._count.bookings} booking{p._count.bookings === 1 ? '' : 's'}
                </p>
                <code className="block truncate text-xs text-primary">{url}</code>
                {p.host.availability.length === 0 ? <p className="text-xs text-amber-300">⚠ The host hasn&apos;t set working hours, so no times are offered yet.</p> : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <CopyButton text={url} />
                <a href={url} target="_blank" rel="noreferrer" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                  Open ↗
                </a>
              </div>
            </CardHeader>
            <CardContent>
              <details>
                <summary className="cursor-pointer select-none text-sm font-medium text-primary hover:underline">Edit page</summary>
                <div className="pt-4">
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
                  <div className="mt-4 border-t pt-4">
                    <DangerButton
                      label="Delete page"
                      confirm={`Delete /book/${p.slug}? The link stops working. Existing bookings are kept.`}
                      action={async () => {
                        'use server'
                        return deleteBookingPage(p.id)
                      }}
                    />
                  </div>
                </div>
              </details>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
