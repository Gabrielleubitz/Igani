import { NextRequest, NextResponse } from 'next/server'
import { normalizeWebsiteUrl } from '@/lib/websiteUrl'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^\[::1\]$/,
]

function isPublicHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    return !PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(parsed.hostname))
  } catch {
    return false
  }
}

function isBlockedByHeaders(headers: Headers): { blocked: boolean; reason?: string } {
  const xFrame = headers.get('x-frame-options')?.toUpperCase()
  if (xFrame === 'DENY') {
    return { blocked: true, reason: 'X-Frame-Options: DENY' }
  }
  if (xFrame === 'SAMEORIGIN') {
    return { blocked: true, reason: 'X-Frame-Options: SAMEORIGIN' }
  }

  const csp =
    headers.get('content-security-policy') ??
    headers.get('content-security-policy-report-only') ??
    ''

  if (/frame-ancestors\s+'none'/i.test(csp)) {
    return { blocked: true, reason: "CSP frame-ancestors 'none'" }
  }

  return { blocked: false }
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url') ?? ''

  let normalized = ''
  try {
    normalized = normalizeWebsiteUrl(rawUrl)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  if (!isPublicHttpUrl(normalized)) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 400 })
  }

  try {
    const response = await fetch(normalized, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
      headers: {
        'User-Agent': 'IganiPreviewBot/1.0',
      },
    })

    const { blocked, reason } = isBlockedByHeaders(response.headers)

    return NextResponse.json({
      embeddable: !blocked,
      reason,
      liveUrl: normalized,
    })
  } catch {
    return NextResponse.json({
      embeddable: true,
      liveUrl: normalized,
    })
  }
}
