import { after, NextResponse } from 'next/server'
import { verifyJaasSignature } from '@/lib/meet'
import { recordJaasEvent, saveMeetRecording } from '@/lib/meet-recording'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/** copying a long recording into storage happens after the reply, and can take a few minutes */
export const maxDuration = 300

/**
 * 8x8 (JaaS) webhook. Set it up in the 8x8 console → Webhooks with this URL and the RECORDING_UPLOADED event; its
 * signing secret goes in JAAS_WEBHOOK_SECRET. Every request must carry a valid, recent X-Jaas-Signature.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const secret = process.env.JAAS_WEBHOOK_SECRET?.trim()
  if (!secret) return NextResponse.json({ error: 'Not set up' }, { status: 503 })
  const raw = await req.text()
  if (raw.length > 200_000 || !verifyJaasSignature(raw, req.headers.get('x-jaas-signature'), secret)) return NextResponse.json({ error: 'Bad signature' }, { status: 401 })
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 })
  }
  const id = await recordJaasEvent(body)
  // answer 8x8 straight away (it retries slow webhooks); the copy runs after the response
  if (id) after(() => saveMeetRecording(id))
  return NextResponse.json({ ok: true })
}
