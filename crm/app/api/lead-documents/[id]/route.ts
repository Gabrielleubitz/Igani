import { NextResponse, type NextRequest } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { canSeeLead } from '@/lib/lead-access'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Download a client document: only people who can see its lead. Anything else looks like "not found". */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const user = await currentUserOrNull()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const d = await prisma.leadDocument.findUnique({ where: { id: params.id }, include: { lead: { select: { assignedToId: true } } } })
  if (!d || !canSeeLead(user, d.lead)) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  return new NextResponse(new Uint8Array(d.data), {
    headers: {
      'Content-Type': d.mimeType,
      'Content-Length': String(d.size),
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(d.fileName)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
