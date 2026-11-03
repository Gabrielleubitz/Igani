import { NextResponse } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { downloadContract } from '@/lib/cloudinary'
import { approvedContract, renderContract } from '@/lib/contract-data'
import { isLocalDev } from '@/lib/offers'
import { htmlToPdf } from '@/lib/pdf-render'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * The offer's contract, for the in-page viewer. A contract built in the CRM is shown as a page (with the client's
 * current module choice) and downloads as PDF (?download=1); an uploaded PDF is served as-is. Live/signed offers only,
 * drafts for admins (or locally).
 */
export async function GET(req: Request, props: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  const params = await props.params;
  const offer = await prisma.offer.findUnique({ where: { slug: params.slug }, include: { lead: { select: { firstName: true, lastName: true, email: true, phone: true, company: true } } } })
  if (!offer || offer.status === 'ARCHIVED') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (offer.status === 'DRAFT' && !isLocalDev() && (await currentUserOrNull())?.role !== 'ADMIN') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const download = new URL(req.url).searchParams.get('download') === '1'
  try {
    const built = approvedContract(offer)
    if (built) {
      const html = await renderContract(offer, built, { status: 'approved' })
      if (!download) return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store' } })
      const pdf = await htmlToPdf(html)
      return new NextResponse(Buffer.from(pdf), { headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="${offer.slug}-agreement.pdf"`, 'cache-control': 'private, no-store' } })
    }
    if (!offer.contractPublicId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const pdf = await downloadContract(offer.contractPublicId)
    const name = (offer.contractFileName ?? 'agreement.pdf').replace(/[^\w.\- ]+/g, '_')
    return new NextResponse(Buffer.from(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${name}"`, 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff' } })
  } catch (err) {
    console.error('[offers] contract failed', err)
    return NextResponse.json({ error: 'The agreement could not be loaded. Please try again.' }, { status: 502 })
  }
}
