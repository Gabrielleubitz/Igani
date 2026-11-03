import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { slugProblem } from '@/lib/offer-modules'
import { isLocalDev } from '@/lib/offers'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Local studio only: prepares an offer for Claude and the preview. Called by the studio helper (studio/launcher.mjs)
 * with the bridge key; does not exist on the deployed site.
 *   1. copy the offer from the live CRM (numbers, contract, client)   (skipped with ?pull=0)
 *   2. create offers/<slug>/ on first use
 *   3. refresh assets.json (uploaded logo) and offer-data.json (what Claude reads)
 */
export async function POST(req: Request, { params }: { params: { slug: string } }): Promise<NextResponse> {
  if (!isLocalDev() || slugProblem(params.slug)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { pullOffer, scaffoldOffer, studioRemote, studioToken, writeAssetsManifest, writeOfferData } = await import('@/lib/offer-studio')
  const expected = studioToken()
  const got = req.headers.get('x-studio-token') ?? ''
  if (!expected || got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const slug = params.slug
  const pull = new URL(req.url).searchParams.get('pull') !== '0'
  let warning: string | null = null
  if (pull && studioRemote()) {
    try {
      await pullOffer(slug)
    } catch (err) {
      warning = `Could not refresh from the live CRM: ${err instanceof Error ? err.message : String(err)}`
    }
  }
  if (!(await prisma.offer.findUnique({ where: { slug }, select: { id: true } }))) {
    return NextResponse.json({ error: studioRemote() ? `There is no offer "${slug}" in the CRM yet. Create it first (Offers → New offer).` : 'OFFER_STUDIO_REMOTE / OFFER_STUDIO_TOKEN are missing in crm/.env.local.' }, { status: 404 })
  }
  scaffoldOffer(slug)
  writeAssetsManifest(slug)
  await writeOfferData(slug)
  return NextResponse.json({ ok: true, warning })
}
