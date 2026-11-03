import Link from 'next/link'
import { StudioWorkspace } from '@/components/admin/StudioWorkspace'
import { PageIntro } from '@/components/PageIntro'
import { Card, CardContent } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { slugProblem } from '@/lib/offer-modules'
import { isLocalDev, localOfferUrl } from '@/lib/offers'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Offer studio' }
export const dynamic = 'force-dynamic'

function Note({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <Card>
      <CardContent className="space-y-2 p-6 text-sm">
        <h2 className="text-base font-semibold">{title}</h2>
        {children}
      </CardContent>
    </Card>
  )
}

/** Claude + live preview for one offer. Only works in the local CRM (npm run studio), never on Vercel. */
export default async function StudioPage({ params }: { params: { slug: string } }): Promise<React.ReactElement> {
  await requireUser(['ADMIN'])
  const slug = params.slug
  const header = <PageIntro title={`Studio · ${slug}`} hint='Tell Claude what to build. The preview on the right updates as it works. Say "push" when it is ready to go live.' />

  if (!isLocalDev() || slugProblem(slug)) {
    return (
      <div className="space-y-6">
        {header}
        <Note title="The studio runs on your Mac">
          <p>Claude needs your computer to write the offer, so the studio only opens from the local CRM.</p>
          <ol className="list-decimal space-y-1 ps-5 text-muted-foreground">
            <li>
              In Terminal: <code className="rounded bg-muted px-1">cd igani/crm && npm run studio</code>
            </li>
            <li>
              Open <code className="rounded bg-muted px-1">http://localhost:3100/admin/offers/studio/{slug}</code>
            </li>
          </ol>
        </Note>
      </div>
    )
  }

  const { pullOffer, scaffoldOffer, studioRemote, studioToken, writeOfferData } = await import('@/lib/offer-studio')
  let pullError: string | null = null
  if (studioRemote()) {
    try {
      await pullOffer(slug)
    } catch (err) {
      pullError = err instanceof Error ? err.message : String(err)
    }
  }
  const offer = await prisma.offer.findUnique({ where: { slug }, select: { id: true, title: true } })
  if (!offer) {
    return (
      <div className="space-y-6">
        {header}
        <Note title="No offer with this address">
          <p>
            Create it first in the CRM (Offers → New offer).{' '}
            {studioRemote() ? 'It was not found in the live CRM either.' : 'To work on offers made in the live CRM, add OFFER_STUDIO_REMOTE and OFFER_STUDIO_TOKEN to crm/.env.local.'}
          </p>
          {pullError ? <p className="text-rose-400">{pullError}</p> : null}
        </Note>
      </div>
    )
  }
  scaffoldOffer(slug)
  await writeOfferData(slug)
  const token = studioToken()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {header}
        <Link href={`/admin/offers/${offer.id}`} className="text-sm text-muted-foreground hover:text-foreground">
          Numbers and contract →
        </Link>
      </div>
      {pullError ? <p className="text-sm text-amber-400">Could not refresh from the live CRM ({pullError}). Showing the local copy.</p> : null}
      {token ? (
        <StudioWorkspace slug={slug} token={token} previewUrl={localOfferUrl(slug)} />
      ) : (
        <Note title="The terminal bridge isn't running">
          <p>
            Start the CRM with <code className="rounded bg-muted px-1">npm run studio</code> (not <code className="rounded bg-muted px-1">npm run dev</code>) so Claude has a terminal, then reload this page.
          </p>
        </Note>
      )}
    </div>
  )
}
