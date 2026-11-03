import { NextResponse } from 'next/server'
import { z } from 'zod'
import { normalizeSelection, parseModules } from '@/lib/offer-modules'
import { prisma } from '@/lib/prisma'

const Body = z.object({ modules: z.array(z.string().max(80)).max(60) })

/** The client's module choice on a live offer, saved so the team sees it in the CRM. */
export async function POST(req: Request, props: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  const params = await props.params;
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const offer = await prisma.offer.findUnique({ where: { slug: params.slug }, select: { id: true, status: true, modules: true } })
  if (!offer || offer.status !== 'LIVE') return NextResponse.json({ error: 'This offer is not open for changes.' }, { status: 404 })
  const selected = normalizeSelection(parseModules(offer.modules), parsed.data.modules)
  await prisma.offer.update({ where: { id: offer.id }, data: { selectedModules: selected } })
  return NextResponse.json({ ok: true, modules: selected })
}
