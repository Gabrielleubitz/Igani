import { NextResponse } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { downloadContract } from '@/lib/cloudinary'
import { isLocalDev } from '@/lib/offers'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The offer's contract PDF, served from our own address (shown in the in-page viewer). Anyone with the link of a live or
 * signed offer may read it, like the offer itself; drafts only for admins (or locally).
 */
export async function GET(req: Request, { params }: { params: { slug: string } }): Promise<NextResponse> {
  const offer = await prisma.offer.findUnique({ where: { slug: params.slug }, select: { status: true, contractPublicId: true, contractFileName: true } })
  if (!offer || offer.status === 'ARCHIVED' || !offer.contractPublicId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (offer.status === 'DRAFT' && !isLocalDev() && (await currentUserOrNull())?.role !== 'ADMIN') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const pdf = await downloadContract(offer.contractPublicId)
    const name = (offer.contractFileName ?? 'agreement.pdf').replace(/[^\w.\- ]+/g, '_')
    const disposition = new URL(req.url).searchParams.get('download') === '1' ? 'attachment' : 'inline'
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${name}"`,
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    console.error('[offers] contract download failed', err)
    return NextResponse.json({ error: 'The agreement could not be loaded. Please try again.' }, { status: 502 })
  }
}
