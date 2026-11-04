import { advanceCall, fromTwilioStatus } from '@/lib/calls'
import { readTwilioWebhook } from '@/lib/twilio'

export const dynamic = 'force-dynamic'

/** Progress of the phone leg (initiated → ringing → answered → completed / busy / no-answer / failed / canceled). */
export async function POST(req: Request): Promise<Response> {
  const p = await readTwilioWebhook(req, 'status')
  if (!p) return new Response('Forbidden', { status: 403 })
  const callId = new URL(req.url).searchParams.get('callId')
  const status = fromTwilioStatus(p.CallStatus)
  if (callId && status) {
    const duration = p.CallDuration ? Number.parseInt(p.CallDuration, 10) : null
    await advanceCall(callId, { status, childCallSid: p.CallSid ?? null, durationSec: Number.isFinite(duration) ? duration : null })
  }
  return new Response(null, { status: 204 })
}
