import { NextResponse, type NextRequest } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { canOpenAgreement } from '@/lib/agreements'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Download an agreement: admins any, a salesperson only their own. Anything else looks like "not found". */
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = await props.params;
  const user = await currentUserOrNull()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const a = await prisma.agreement.findUnique({ where: { id: params.id } })
  if (!a || !canOpenAgreement(user, a)) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  return new NextResponse(new Uint8Array(a.data), {
    headers: {
      'Content-Type': a.mimeType,
      'Content-Length': String(a.size),
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(a.fileName)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
