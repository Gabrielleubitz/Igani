import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { APP_CALLBACK, SESSION_COOKIES } from '@/lib/mobile'

export const dynamic = 'force-dynamic'

/**
 * Last step of signing in to the iOS app. The app opens the CRM's own sign-in page (Google, whitelist only) in
 * Apple's sign-in sheet with this route as the callback; once signed in, the session is handed straight back to the
 * app through its URL scheme. The sheet delivers igani-crm:// links only to the app that opened it.
 */
export async function GET(req: Request): Promise<NextResponse> {
  const user = await currentUserOrNull()
  const jar = await cookies()
  const cookie = SESSION_COOKIES.map((name) => ({ name, value: jar.get(name)?.value })).find((c) => c.value)
  if (!user || !cookie?.value) {
    const login = new URL('/login', req.url)
    login.searchParams.set('callbackUrl', '/api/mobile/auth/finish')
    return NextResponse.redirect(login)
  }
  const back = new URL(APP_CALLBACK)
  back.searchParams.set('cookie', cookie.name)
  back.searchParams.set('token', cookie.value)
  const res = NextResponse.redirect(back.toString())
  res.headers.set('Cache-Control', 'no-store')
  res.headers.set('Referrer-Policy', 'no-referrer')
  return res
}
