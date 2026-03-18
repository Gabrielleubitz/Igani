import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { listApiKeys, createApiKeyRecord } from '@/lib/api-keys'

const CreateKeySchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(64, 'name must be ≤ 64 chars'),
})

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
    const raw = await request.json().catch(() => ({}))
    const parsed = CreateKeySchema.safeParse(raw)
    const name = parsed.success ? parsed.data.name : 'Unnamed Key'

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
