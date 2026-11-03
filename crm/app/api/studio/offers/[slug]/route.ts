import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { advanceLeadOnPublish, loadDefinition } from '@/lib/offers'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Machine API for the local studio (no session): read an offer to copy it locally, and publish it on "push".
 * Secured by OFFER_STUDIO_TOKEN (Bearer). Without the env var the endpoint doesn't exist.
 */
function authorized(req: Request): boolean {
  const expected = process.env.OFFER_STUDIO_TOKEN
  if (!expected || expected.length < 32) return false
  const got = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const a = Buffer.from(got)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

const notFound = (): NextResponse => NextResponse.json({ error: 'Not found' }, { status: 404 })

export async function GET(req: Request, props: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  const params = await props.params;
  if (!authorized(req)) return notFound()
  const o = await prisma.offer.findUnique({
    where: { slug: params.slug },
    include: { lead: { select: { firstName: true, lastName: true, email: true, phone: true, company: true, website: true, message: true } } },
  })
  if (!o) return notFound()
  return NextResponse.json({
    slug: o.slug,
    title: o.title,
    status: o.status,
    currency: o.currency,
    monthlyPrice: o.monthlyPrice,
    timelineMonths: o.timelineMonths,
    modules: o.modules,
    contractUrl: o.contractUrl,
    contractPublicId: o.contractPublicId,
    contractFileName: o.contractFileName,
    lead: o.lead,
    // True once this deployment includes offers/<slug>/ (the push script waits for it before publishing)
    contentReady: (await loadDefinition(o.slug)) !== null,
  })
}

const Body = z.object({ action: z.literal('publish') })

export async function POST(req: Request, props: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  const params = await props.params;
  if (!authorized(req)) return notFound()
  if (!Body.safeParse(await req.json().catch(() => null)).success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const o = await prisma.offer.findUnique({ where: { slug: params.slug }, select: { id: true, status: true, leadId: true, publishedAt: true } })
  if (!o) return notFound()
  if (o.status === 'SIGNED' || o.status === 'ARCHIVED') return NextResponse.json({ ok: true, status: o.status, note: `Content updated; the offer stays ${o.status.toLowerCase()}.` })
  if (o.status === 'DRAFT') {
    await prisma.$transaction(async (tx) => {
      await tx.offer.update({ where: { id: o.id }, data: { status: 'LIVE', publishedAt: o.publishedAt ?? new Date() } })
      await logActivity({ entityType: 'LEAD', entityId: o.leadId, action: 'offer.live', metadata: { offerId: o.id, from: 'DRAFT', to: 'LIVE', via: 'studio' } }, tx)
      await advanceLeadOnPublish(tx, o.leadId, o.id, null, 'studio')
    })
  }
  return NextResponse.json({ ok: true, status: 'LIVE' })
}
