import { dialClientIntoRoom, roomEnded } from '@/lib/call-conference'
import { readTwilioWebhook } from '@/lib/twilio'

export const dynamic = 'force-dynamic'

/** A listen-in call's room: when it starts (the rep is in), ring the client; when it ends, stop any ringing. */
export async function POST(req: Request): Promise<Response> {
  const p = await readTwilioWebhook(req, 'conference')
  if (!p) return new Response('Forbidden', { status: 403 })
  const callId = new URL(req.url).searchParams.get('callId')
  if (callId && /^[a-z0-9]{20,40}$/i.test(callId)) {
    if (p.StatusCallbackEvent === 'conference-start' && /^CF[0-9a-f]{32}$/i.test(p.ConferenceSid ?? '')) await dialClientIntoRoom(callId, p.ConferenceSid!)
    else if (p.StatusCallbackEvent === 'conference-end') await roomEnded(callId)
  }
  return new Response(null, { status: 204 })
}
