import { waitUntil } from '@vercel/functions'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'
import { assignLeadToDefaultOwner, ingestLead, leadPayloadSchema, notifyTeamOfNewLead } from '@/lib/leads'
import { safeEqual } from '@/lib/tokens'
import { logActivity } from '@/lib/audit'
import { checkSubmission } from '@/lib/spam-check'

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

  // Fake sign-ups never become leads (second line of defence; the website filters first). Answered like a normal
  // lead so whoever sends them learns nothing; recorded so an admin can see what was blocked.
  const verdict = checkSubmission({ firstName: parsed.data.firstName, lastName: parsed.data.lastName, email: parsed.data.email, company: parsed.data.company, message: parsed.data.message })
  if (verdict.spam && !parsed.data.backfill) {
    await logActivity({ entityType: 'SETTING', entityId: 'spam-blocked', action: 'lead.spam_blocked', metadata: { email: parsed.data.email ?? null, name: [parsed.data.firstName, parsed.data.lastName].filter(Boolean).join(' ') || null, reasons: verdict.reasons, score: verdict.score } }).catch(() => undefined)
    return NextResponse.json({ id: null, duplicate: false }, { status: 201 })
  }

  try {
    const result = await ingestLead(parsed.data)
    // Historical backfills land quietly: no round-robin, no alert emails (the team assigns them in bulk).
    if (!parsed.data.backfill && (result.created || result.needsAssignment)) {
      // Respond immediately; assignment continues after the response is sent.
      waitUntil(
        assignLeadToDefaultOwner(result.leadId)
          .catch((err: unknown) => console.error('[leads] assignment failed', result.leadId, err))
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
