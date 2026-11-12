import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { instagramAuthorizeUrl, instagramConfig } from '@/lib/instagram'

export const dynamic = 'force-dynamic'

/** Admins: start connecting Igani's Instagram account. */
export async function GET(req: Request): Promise<NextResponse> {
  const user = await currentUserOrNull()
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!instagramConfig()) return NextResponse.redirect(new URL('/admin/settings?instagram=not-configured#instagram', req.url))
  const state = randomBytes(24).toString('base64url')
  const res = NextResponse.redirect(instagramAuthorizeUrl(state))
  res.cookies.set('instagram_oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/public/instagram', maxAge: 600 })
  return res
}
