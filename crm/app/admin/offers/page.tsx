import Link from 'next/link'
import { NewOfferForm } from '@/components/admin/OfferForms'
import { PageIntro } from '@/components/PageIntro'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Popover } from '@/components/ui/popover'
import { requireUser } from '@/lib/auth'
import { leadName } from '@/lib/format'
import { OFFER_STATUS_LABEL, OFFER_STATUS_TONE, leadOptions } from '@/lib/offer-admin'
import { defaultSelection, formatPrice, normalizeSelection, parseModules, selectionTotal } from '@/lib/offer-modules'
import { liveOfferUrl } from '@/lib/offers'
import { offerScope } from '@/lib/offer-access'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Offers' }
export const dynamic = 'force-dynamic'

export default async function OffersPage({ searchParams }: { searchParams: { lead?: string } }): Promise<React.ReactElement> {
  const user = await requireUser(['ADMIN'])
  const [offers, leads] = await Promise.all([
    prisma.offer.findMany({ where: offerScope(user), orderBy: { updatedAt: 'desc' }, include: { lead: { select: { firstName: true, lastName: true, email: true, company: true } } } }),
    leadOptions(),
  ])
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageIntro title="Offers" hint="Proposal pages for leads, each at its own address (name.app.igani.co). You set the numbers and contract here; Claude writes the rest in the studio." />
        <div className="flex items-center gap-2">
          <Link href="/admin/offers/blocks" className="text-sm text-muted-foreground hover:text-foreground">
            Block library →
          </Link>
          <Popover label="+ New offer" panelClassName="sm:w-[min(92vw,34rem)]">
            <NewOfferForm leads={leads} initialLeadId={searchParams.lead} />
          </Popover>
        </div>
      </div>
      {offers.length === 0 ? <EmptyState title="No offers yet" description="Create one for a lead, then open it in the studio and tell Claude what to build." /> : null}
      <div className="grid gap-3">
        {offers.map((o) => {
          const modules = parseModules(o.modules)
          const total = o.signedTotal ?? selectionTotal(modules, o.selectedModules.length ? normalizeSelection(modules, o.selectedModules) : defaultSelection(modules))
          return (
            <Card key={o.id}>
              <CardContent className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/offers/${o.id}`} className="font-semibold hover:underline">
                    {o.title}
                  </Link>
                  <div className="truncate text-sm text-muted-foreground">
                    {o.lead.company || leadName(o.lead)} · <span className="font-mono text-xs">{liveOfferUrl(o.slug).replace('https://', '')}</span>
                  </div>
                </div>
                <div className="text-sm tabular-nums">{modules.length ? formatPrice(total, o.currency) : '–'}</div>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${OFFER_STATUS_TONE[o.status]}`}>{OFFER_STATUS_LABEL[o.status]}</span>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
