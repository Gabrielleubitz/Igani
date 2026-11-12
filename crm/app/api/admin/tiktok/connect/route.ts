import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { authorizeUrl, tiktokConfig } from '@/lib/tiktok'

export const dynamic = 'force-dynamic'

/** Admins: start connecting Igani's TikTok account. */
export async function GET(req: Request): Promise<NextResponse> {
  const user = await currentUserOrNull()
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!tiktokConfig()) return NextResponse.redirect(new URL('/admin/settings?tiktok=not-configured#tiktok', req.url))
  const state = randomBytes(24).toString('base64url')
  const res = NextResponse.redirect(authorizeUrl(state))
  res.cookies.set('tiktok_oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/public/tiktok', maxAge: 600 })
  return res
}
