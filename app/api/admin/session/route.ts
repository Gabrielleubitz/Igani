import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, ADMIN_SESSION_MS, adminPassword, adminSecret, createAdminToken, safeEqual, verifyAdminToken } from '@/lib/admin-session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET: is this browser signed in to the admin panel? */
export async function GET(req: NextRequest) {
  const ok = await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value, adminSecret())
  return NextResponse.json({ authenticated: ok }, { headers: { 'Cache-Control': 'no-store' } })
}

/** POST { password }: sign in (password is checked here on the server, never shipped to the browser). */
export async function POST(req: NextRequest) {
  const expected = adminPassword()
  if (!expected) return NextResponse.json({ error: 'Admin password is not configured.' }, { status: 503 })
  const body = (await req.json().catch(() => ({}))) as { password?: unknown }
  const given = typeof body.password === 'string' ? body.password : ''
  if (!given || !safeEqual(given, expected)) {
    await new Promise((r) => setTimeout(r, 400)) // slow down guessing
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }
  const res = NextResponse.json({ authenticated: true })
  res.cookies.set(ADMIN_COOKIE, await createAdminToken(adminSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: Math.floor(ADMIN_SESSION_MS / 1000),
  })
  return res
}

/** DELETE: sign out. */
export async function DELETE() {
  const res = NextResponse.json({ authenticated: false })
  res.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
