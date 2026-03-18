import { NextRequest, NextResponse } from 'next/server'
import { findAndVerifyApiKey } from './api-keys'

export interface AuthedRequest extends NextRequest {
  apiKeyId?: string
  apiKeyName?: string
}

type RouteHandler = (req: NextRequest, ctx: { params: Record<string, string> }) => Promise<NextResponse>

/**
 * Higher-order function that wraps a route handler with API key authentication.
 *
 * Usage:
 *   export const POST = withApiKeyAuth(async (req) => { ... })
 *
 * The caller must include: Authorization: Bearer sk_live_<token>
 */
export function withApiKeyAuth(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    const authHeader = req.headers.get('authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or malformed Authorization header. Expected: Bearer <api_key>' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7).trim()
    if (!token) {
      return NextResponse.json({ error: 'Empty API key' }, { status: 401 })
    }

    const keyRecord = await findAndVerifyApiKey(token)
    if (!keyRecord) {
      // 401 (not 403): the request lacks valid authentication credentials
      return NextResponse.json({ error: 'Invalid or revoked API key' }, { status: 401 })
    }

    // Attach key metadata to headers for the handler if needed
    const mutated = new NextRequest(req, {
      headers: new Headers({
        ...Object.fromEntries(req.headers.entries()),
        'x-api-key-id': keyRecord.id,
        'x-api-key-name': keyRecord.name,
      }),
    })

    return handler(mutated, ctx)
  }
}

/**
 * Standalone verifier — call directly inside a route when you prefer
 * imperative style over the HOF wrapper.
 *
 * Returns the key record on success, or a 401/403 NextResponse on failure.
 */
export async function requireApiKey(
  req: NextRequest
): Promise<{ id: string; name: string } | NextResponse> {
  const authHeader = req.headers.get('authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing Authorization header. Expected: Bearer <api_key>' },
      { status: 401 }
    )
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    return NextResponse.json({ error: 'Empty API key' }, { status: 401 })
  }

  const keyRecord = await findAndVerifyApiKey(token)
  if (!keyRecord) {
    return NextResponse.json({ error: 'Invalid or revoked API key' }, { status: 401 })
  }

  return { id: keyRecord.id, name: keyRecord.name }
}
