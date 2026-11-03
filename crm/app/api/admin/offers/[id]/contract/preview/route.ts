import { NextResponse } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { parseContractDoc } from '@/lib/contract'
import { renderContract } from '@/lib/contract-data'
import { htmlToPdf } from '@/lib/pdf-render'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Admin preview of the contract as the client will see it (HTML), or the real PDF with ?format=pdf. */
export async function GET(req: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  if ((await currentUserOrNull())?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const o = await prisma.offer.findUnique({ where: { id: params.id }, include: { lead: { select: { firstName: true, lastName: true, email: true, phone: true, company: true } } } })
  const doc = o ? parseContractDoc(o.contractDoc) : null
  if (!o || !doc) return new NextResponse('<p style="font-family:sans-serif;color:#64748b;padding:24px">No contract yet. Draft it first.</p>', { headers: { 'content-type': 'text/html; charset=utf-8' } })
  const html = await renderContract(o, doc, { status: o.contractApprovedAt ? 'approved' : 'draft' })
  if (new URL(req.url).searchParams.get('format') !== 'pdf') return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
  const pdf = await htmlToPdf(html)
  return new NextResponse(Buffer.from(pdf), { headers: { 'content-type': 'application/pdf', 'content-disposition': `inline; filename="${o.slug}-contract.pdf"`, 'cache-control': 'no-store' } })
}
