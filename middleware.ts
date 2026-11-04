import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, adminApiNeedsSession, adminSecret, verifyAdminToken } from '@/lib/admin-session'

export async function middleware(request: NextRequest) {
  // Admin APIs: require the server-issued admin session cookie (see /api/admin/session).
  if (adminApiNeedsSession(request.nextUrl.pathname, request.method)) {
    const ok = await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value, adminSecret())
    if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hostname = request.headers.get('host') || ''

  // The old funnels subdomain now lives at realestate.igani.co
  if (hostname.startsWith('funnels.')) {
    const url = new URL(`https://realestate.igani.co${request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/realestate' ? '/' : request.nextUrl.pathname}`)
    url.search = request.nextUrl.search
    return NextResponse.redirect(url, 308)
  }

  // Security headers
  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  // The CRM (Admin → Website) shows the home page in a frame to draw its heatmap. Only that page,
  // only with ?igani-heatmap=1 (where the tracker records nothing), and only inside app.igani.co. Everything else: DENY.
  const heatmapFrame = request.nextUrl.searchParams.get('igani-heatmap') === '1' && request.nextUrl.pathname === '/'
  const crmOrigins = process.env.NODE_ENV === 'production' ? 'https://app.igani.co' : 'https://app.igani.co http://localhost:3100'
  if (heatmapFrame) response.headers.set('Content-Security-Policy', `frame-ancestors ${crmOrigins}`)
  else response.headers.set('X-Frame-Options', 'DENY')
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
    '/backend-admin/:path*',
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
}