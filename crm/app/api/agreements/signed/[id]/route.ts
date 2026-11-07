import { NextResponse, type NextRequest } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** The signed commission agreement PDF: admins any, a salesperson only the one signed under their own email. */
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = await props.params
  const user = await currentUserOrNull()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const a = await prisma.agreementAcceptance.findUnique({ where: { id: params.id }, select: { email: true, signerName: true, pdf: true } })
  if (!a || (user.role !== 'ADMIN' && user.email?.toLowerCase() !== a.email)) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const name = `Igani-Commission-Agreement-${a.signerName.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'Representative'}.pdf`
  return new NextResponse(new Uint8Array(a.pdf), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}
