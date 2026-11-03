import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/audit'
import { currentUserOrNull } from '@/lib/auth'
import { buildOfferExport } from '@/lib/offer-export'
import { canSeeOffer } from '@/lib/offer-access'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// The AI implementation plan in BUILD.md can take a couple of minutes
export const maxDuration = 300

/** Downloads the agreed UI as a Next.js project + BUILD.md. Admins only; published (live or signed) offers only. ?ai=0 skips the AI plan. */
export async function GET(req: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  const user = await currentUserOrNull()
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const offer = await prisma.offer.findUnique({ where: { id: params.id }, include: { lead: { select: { firstName: true, lastName: true, email: true, phone: true, company: true, website: true } } } })
  if (!offer || !canSeeOffer(user, offer)) return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
  if (offer.status !== 'LIVE' && offer.status !== 'SIGNED') return NextResponse.json({ error: 'Publish the offer first: only the UI a client has seen can be exported.' }, { status: 409 })
  try {
    const { zip, fileName } = await buildOfferExport(offer, { ai: new URL(req.url).searchParams.get('ai') !== '0' })
    await logActivity({ entityType: 'OFFER', entityId: offer.id, action: 'offer.exported', actorId: user.id, metadata: { bytes: zip.byteLength } })
    return new NextResponse(Buffer.from(zip), { headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${fileName}"`, 'Cache-Control': 'no-store' } })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Export failed' }, { status: 500 })
  }
}
