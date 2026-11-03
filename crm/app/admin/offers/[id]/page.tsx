import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ContractUpload, OfferEditor, OfferStatusActions } from '@/components/admin/OfferForms'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CopyButton } from '@/components/ui/copy-button'
import { requireUser } from '@/lib/auth'
import { leadName } from '@/lib/format'
import { OFFER_STATUS_LABEL, OFFER_STATUS_TONE } from '@/lib/offer-admin'
import { formatPrice, parseModules } from '@/lib/offer-modules'
import { isLocalDev, liveOfferUrl, loadDefinition, localOfferUrl } from '@/lib/offers'
import { transcriptAiEnabled } from '@/lib/offer-transcript-ai'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Offer' }
export const dynamic = 'force-dynamic'
// The transcript → modules AI step can take a while on long calls
export const maxDuration = 180

export default async function OfferAdminPage({ params }: { params: { id: string } }): Promise<React.ReactElement> {
  await requireUser(['ADMIN'])
  const offer = await prisma.offer.findUnique({ where: { id: params.id }, include: { lead: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true, status: true } } } })
  if (!offer) notFound()
  const modules = parseModules(offer.modules)
  const definition = await loadDefinition(offer.slug)
  const live = liveOfferUrl(offer.slug)
  const local = isLocalDev()
  const chosen = modules.filter((m) => offer.selectedModules.includes(m.id))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/offers" className="text-sm text-muted-foreground hover:text-foreground">
            ← Offers
          </Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-3 text-2xl font-semibold">
            {offer.title}
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${OFFER_STATUS_TONE[offer.status]}`}>{OFFER_STATUS_LABEL[offer.status]}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            For{' '}
            <Link href={`/sales/leads/${offer.lead.id}`} className="text-foreground hover:underline">
              {offer.lead.company ? `${offer.lead.company} (${leadName(offer.lead)})` : leadName(offer.lead)}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {offer.status === 'LIVE' || offer.status === 'SIGNED' ? (
            <a href={`/api/admin/offers/${offer.id}/export`} className={buttonVariants({ variant: offer.status === 'SIGNED' ? 'default' : 'outline', size: 'sm' })} title="A Next.js project with the agreed screens and BUILD.md (takes 1–2 minutes)">
              Export UI (.zip)
            </a>
          ) : null}
          <OfferStatusActions offerId={offer.id} status={offer.status} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Client link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="break-all font-mono text-xs">{live}</div>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={live} />
              {/* Published: the real client address. Drafts only render for a signed-in admin, which the subdomain can't see */}
              <a href={offer.status === 'DRAFT' ? `/o/${offer.slug}` : live} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                {offer.status === 'DRAFT' ? 'Preview draft' : 'Open'}
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              {offer.status === 'DRAFT' ? 'Drafts are only visible to signed-in admins. Publish when it is ready for the client.' : offer.status === 'LIVE' ? 'The client can choose modules and sign.' : offer.status === 'SIGNED' ? 'Signed. The page stays readable for the client.' : 'Archived: the link shows "not found".'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Studio (Claude)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">Claude writes the text and builds the mockups. The studio opens right here and starts itself on your Mac.</p>
            <Link href={`/admin/offers/studio/${offer.slug}`} className={buttonVariants({ size: 'sm' })}>
              Open studio
            </Link>
            <p className="text-xs text-muted-foreground">
              Content in this deployment: {definition ? <span className="text-emerald-400">ready</span> : <span className="text-amber-400">not pushed yet</span>}
              {local ? (
                <>
                  {' '}
                  · local preview{' '}
                  <a href={localOfferUrl(offer.slug)} target="_blank" rel="noreferrer" className="underline">
                    {localOfferUrl(offer.slug).replace('http://', '')}
                  </a>
                </>
              ) : null}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Contract</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${offer.signedAt ? 'bg-teal-500/15 text-teal-300' : offer.contractApprovedAt ? 'bg-emerald-500/15 text-emerald-400' : offer.contractDoc ? 'bg-amber-500/15 text-amber-300' : 'bg-muted text-muted-foreground'}`}
              >
                {offer.signedAt ? 'Signed' : offer.contractApprovedAt ? 'Approved · ready to sign' : offer.contractDoc ? 'Draft' : 'Not drafted'}
              </span>
              <Link href={`/admin/offers/${offer.id}/contract`} className={buttonVariants({ size: 'sm', variant: offer.contractDoc ? 'outline' : 'default' })}>
                {offer.contractDoc ? 'Edit contract' : 'Build contract with AI'}
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">Built from Igani&apos;s standard terms and this offer, with both logos and signature boxes. Once approved, it is what the client signs.</p>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Or use your own PDF</summary>
              <div className="mt-2">
                <ContractUpload offerId={offer.id} current={offer.contractPublicId ? { url: `/api/public/offers/${offer.slug}/contract`, fileName: offer.contractFileName ?? 'Contract.pdf' } : null} locked={offer.status === 'SIGNED'} />
                {offer.contractApprovedAt ? <p className="mt-2 text-amber-400">An approved built contract takes priority over an uploaded PDF.</p> : null}
              </div>
            </details>
          </CardContent>
        </Card>
      </div>

      {offer.signedAt ? (
        <Card className="border-teal-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Signed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>
              {offer.signerName} ({offer.signerEmail}) on {offer.signedAt.toLocaleString('en-GB', { timeZone: 'Asia/Jerusalem', dateStyle: 'long', timeStyle: 'short' })} · IP {offer.signerIp}
            </div>
            <div>
              One-time total <span className="font-semibold">{formatPrice(offer.signedTotal ?? 0, offer.currency)}</span>
              {offer.monthlyPrice ? ` + ${formatPrice(offer.monthlyPrice, offer.currency)} / month` : ''}
            </div>
            {offer.signedDocumentId ? (
              <a href={`/api/lead-documents/${offer.signedDocumentId}`} className="text-primary hover:underline">
                Download the signed PDF
              </a>
            ) : null}
          </CardContent>
        </Card>
      ) : chosen.length && offer.status === 'LIVE' ? (
        <Card>
          <CardContent className="p-4 text-sm">
            <span className="text-muted-foreground">The client&apos;s current choice:</span> {chosen.map((m) => m.name).join(', ')}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Numbers</CardTitle>
        </CardHeader>
        <CardContent>
          <OfferEditor
            aiEnabled={transcriptAiEnabled()}
            value={{ id: offer.id, title: offer.title, slug: offer.slug, status: offer.status, currency: offer.currency, monthlyPrice: offer.monthlyPrice, timelineMonths: offer.timelineMonths, modules }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
