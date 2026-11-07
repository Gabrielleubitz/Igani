import { encode } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import { normalizeEmail } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Developing only (never in production builds, and only with DEV_LOGIN=1): a session for a whitelisted email, so the
 * app can be run in the simulator against a local server without Google.
 */
export async function POST(req: Request): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production' || process.env.DEV_LOGIN !== '1') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { email } = (await req.json().catch(() => ({}))) as { email?: string }
  const e = normalizeEmail(email ?? '')
  const allowed = e ? await prisma.allowedUser.findUnique({ where: { email: e } }) : null
  if (!allowed?.active) return NextResponse.json({ error: 'That email isn’t on the team.' }, { status: 403 })
  const user = await prisma.user.upsert({ where: { email: e }, create: { email: e, name: e, role: allowed.role }, update: { role: allowed.role } })
  const token = await encode({ token: { sub: user.id, uid: user.id, email: e, name: user.name, role: allowed.role, roleCheckedAt: Date.now() }, secret: process.env.NEXTAUTH_SECRET!, maxAge: 60 * 60 * 24 * 7 })
  return NextResponse.json({ cookie: 'next-auth.session-token', token })
}
