import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Security headers
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Admin route protection (basic protection - should be enhanced with proper auth)
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const authHeader = request.headers.get('authorization')
    const adminKey = process.env.ADMIN_SECRET_KEY
    
    if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
      // In production, implement proper authentication
      // For now, just allow access - implement NextAuth or similar
      console.warn('Admin access without proper authentication')
    }
  }

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