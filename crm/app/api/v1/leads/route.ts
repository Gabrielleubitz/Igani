import { waitUntil } from '@vercel/functions'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'
import { assignLeadRoundRobin, ingestLead, leadPayloadSchema, notifyTeamOfNewLead } from '@/lib/leads'
import { safeEqual } from '@/lib/tokens'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 32 * 1024

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey || !safeEqual(apiKey, env().LEAD_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  const raw = await req.text()
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON' }, { status: 400 })
  }

  const parsed = leadPayloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  try {
    const result = await ingestLead(parsed.data)
    if (result.created || result.needsAssignment) {
      // Respond immediately; assignment continues after the response is sent.
      waitUntil(
        assignLeadRoundRobin(result.leadId)
          .catch((err: unknown) => console.error('[leads] round-robin failed', result.leadId, err))
          // Alert after assignment so the email can say who owns the lead.
          .then(() => (result.created ? notifyTeamOfNewLead(result.leadId) : undefined)),
      )
    }
    return NextResponse.json(
      { id: result.leadId, duplicate: !result.created },
      { status: result.created ? 201 : 200 },
    )
  } catch (err) {
    console.error('[leads] ingest failed', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
