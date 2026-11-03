import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, adminApiNeedsSession, adminSecret, verifyAdminToken } from '@/lib/admin-session'

const FUNNEL_PATHS = ['/realestate']

export async function middleware(request: NextRequest) {
  // Admin APIs: require the server-issued admin session cookie (see /api/admin/session).
  if (adminApiNeedsSession(request.nextUrl.pathname, request.method)) {
    const ok = await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value, adminSecret())
    if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hostname = request.headers.get('host') || ''

  // The funnels subdomain only serves the real estate page
  if (hostname.startsWith('funnels.')) {
    // Anything else goes to it (static files such as case-study screenshots pass through)
    const isStaticFile = /\.[a-z0-9]+$/i.test(request.nextUrl.pathname)
    if (!FUNNEL_PATHS.includes(request.nextUrl.pathname) && !isStaticFile) {
      const url = request.nextUrl.clone()
      url.pathname = '/realestate'
      return NextResponse.redirect(url)
    }
  }

  // Security headers
  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Rate limiting for API routes (basic implementation)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip ?? '127.0.0.1'
    const userAgent = request.headers.get('user-agent') ?? ''
    
    // In production, implement proper rate limiting with Redis or similar
    // For now, just log the request
    console.log(`API request from ${ip}: ${request.nextUrl.pathname}`)
  }

  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
}