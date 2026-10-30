import { getToken } from 'next-auth/jwt'
import { NextResponse, type NextRequest } from 'next/server'
import { canAccess, isPublicPath, isRole } from '@/lib/roles'

function deny(req: NextRequest, status: 401 | 403, reason: string): NextResponse {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: status === 401 ? 'Unauthenticated' : 'Forbidden' }, { status })
  }
  const url = req.nextUrl.clone()
  url.search = ''
  if (status === 401) {
    url.pathname = '/login'
    url.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search)
  } else {
    url.pathname = '/unauthorized'
    url.searchParams.set('reason', reason)
  }
  return NextResponse.redirect(url)
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl
  if (isPublicPath(pathname)) return NextResponse.next()

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return deny(req, 401, 'signed-out')
  const role = isRole(token.role) ? token.role : null
  if (!role) return deny(req, 403, 'not-whitelisted')
  if (!canAccess(role, pathname)) return deny(req, 403, 'forbidden')

  const res = NextResponse.next()
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return res
}

export const config = {
  matcher: ['/', '/admin/:path*', '/sales/:path*', '/marketing/:path*', '/api/:path*'],
}
