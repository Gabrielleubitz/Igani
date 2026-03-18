import { NextRequest, NextResponse } from 'next/server'
import { listApiKeys, createApiKeyRecord } from '@/lib/api-keys'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

/** GET /api/admin/api-keys — list all keys (masked, no hashes) */
export async function GET() {
  try {
    const keys = await listApiKeys()
    return NextResponse.json({ keys }, { headers: CORS })
  } catch (err) {
    console.error('[api-keys] GET error:', err)
    return NextResponse.json({ error: 'Failed to list API keys' }, { status: 500, headers: CORS })
  }
}

/** POST /api/admin/api-keys — generate a new key */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const name = typeof body?.name === 'string' && body.name.trim()
      ? body.name.trim()
      : 'Unnamed Key'

    const { plainKey, record } = await createApiKeyRecord(name)

    return NextResponse.json(
      {
        /** Returned ONCE — never retrievable again */
        key: plainKey,
        record,
      },
      { status: 201, headers: CORS }
    )
  } catch (err) {
    console.error('[api-keys] POST error:', err)
    return NextResponse.json({ error: 'Failed to generate API key' }, { status: 500, headers: CORS })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS })
}
