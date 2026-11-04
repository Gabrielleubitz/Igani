import { getToken } from 'next-auth/jwt'
import { NextResponse, type NextRequest } from 'next/server'
import { offerSlugFromHost } from '@/lib/offer-host'
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

/**
 * Security headers on every response. Framing: the CRM itself is never framed by another site; offer pages may be
 * framed only by the CRM (the studio preview); the contract preview only by the CRM's own pages.
 */
type Framing = 'none' | 'self' | 'crm'
function secure(res: NextResponse, framing: Framing = 'none'): NextResponse {
  // The local studio (localhost:3100) frames offers only while developing; production allows the CRM alone
  const crm = process.env.NODE_ENV === 'production' ? "'self' https://app.igani.co" : "'self' https://app.igani.co http://localhost:3100"
  const ancestors = framing === 'crm' ? crm : framing === 'self' ? "'self'" : "'none'"
  res.headers.set('Content-Security-Policy', `frame-ancestors ${ancestors}; base-uri 'self'; object-src 'none'; form-action 'self' https://accounts.google.com`)
  if (framing === 'none') res.headers.set('X-Frame-Options', 'DENY')
  else if (framing === 'self') res.headers.set('X-Frame-Options', 'SAMEORIGIN')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'geolocation=(), payment=(), usb=(), interest-cohort=()')
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains')
  return res
}

/** Paths that go through the session check below (everything else, e.g. /login, /book, /o, is public). */
const GUARDED = /^\/(admin|sales|marketing|api)(\/|$)/

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl

  // Offer microsites: honey.app.igani.co/<path> (or honey.localhost) serves /o/honey/<path>. APIs and files pass through.
  const offerSlug = offerSlugFromHost(req.headers.get('host'))
  if (offerSlug && !pathname.startsWith('/api/') && !pathname.startsWith('/_next/') && !/\.[a-z0-9]+$/i.test(pathname)) {
    const url = req.nextUrl.clone()
    url.pathname = `/o/${offerSlug}${pathname === '/' ? '' : pathname}`
    const headers = new Headers(req.headers)
    headers.set('x-offer-base', '')
    return secure(NextResponse.rewrite(url, { request: { headers } }), 'crm')
  }

  // The offer's own contract and APIs are framed by the offer page itself (same host)
  const framing: Framing = pathname.startsWith('/o/') ? 'crm' : pathname.startsWith('/api/public/offers/') || /^\/api\/admin\/offers\/[^/]+\/contract\/preview$/.test(pathname) ? 'self' : 'none'
  if (pathname !== '/' && !GUARDED.test(pathname)) return secure(NextResponse.next(), framing)
  if (isPublicPath(pathname)) return secure(NextResponse.next(), framing)

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return secure(deny(req, 401, 'signed-out'))
  const role = isRole(token.role) ? token.role : null
  if (!role) return secure(deny(req, 403, 'not-whitelisted'))
  // The role inside the cookie can be stale (it only refreshes when the session is re-read), so for pages the
  // real role check happens in each layout/server action against the database (requireUser). Here we only gate
  // APIs by the cookie role, and let pages through so a just-promoted teammate isn't wrongly blocked.
  if (pathname.startsWith('/api/') && !canAccess(role, pathname)) return secure(deny(req, 403, 'forbidden'))

  return secure(NextResponse.next(), framing)
}

export const config = {
  // Everything except build assets: offer subdomains need every path. Non-guarded paths return straight away above.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
