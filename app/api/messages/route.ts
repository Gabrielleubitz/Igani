/**
 * GET /api/messages
 *
 * Returns recent contact and support submissions for n8n to process.
 * Requires: Authorization: Bearer sk_live_<key>
 *
 * Query params:
 *   ?type=contact|support|all  (default: all)
 *   ?limit=N                    (default: 50, max: 200)
 */
import { NextRequest, NextResponse } from 'next/server'
import { collection, getDocs, query, orderBy, limit as fsLimit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { withApiKeyAuth } from '@/lib/api-key-auth'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

async function getCollection(col: string, maxDocs: number) {
  const q = query(collection(db, col), orderBy('createdAt', 'desc'), fsLimit(maxDocs))
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      ...Object.fromEntries(
        Object.entries(data).map(([k, v]) => [
          k,
          // Convert Firestore Timestamps to ISO strings
          v && typeof v === 'object' && typeof (v as { toDate?: unknown }).toDate === 'function'
            ? (v as { toDate: () => Date }).toDate().toISOString()
            : v,
        ])
      ),
    }
  })
}

async function handleGet(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'all'
  const rawLimit = parseInt(searchParams.get('limit') ?? '50', 10)
  const cap = Math.min(isNaN(rawLimit) || rawLimit < 1 ? 50 : rawLimit, 200)

  try {
    const results: Record<string, unknown[]> = {}

    if (type === 'contact' || type === 'all') {
      results.contact = await getCollection('contactSubmissions', cap)
    }
    if (type === 'support' || type === 'all') {
      results.support = await getCollection('supportInquiries', cap)
    }

    if (!['contact', 'support', 'all'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid ?type. Use: contact | support | all' },
        { status: 400, headers: CORS }
      )
    }

    return NextResponse.json({ ...results, fetchedAt: new Date().toISOString() }, { headers: CORS })
  } catch (err) {
    console.error('[messages] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500, headers: CORS })
  }
}

export const GET = withApiKeyAuth(handleGet)

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS })
}
