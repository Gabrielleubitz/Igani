import { streamEnded } from '@/lib/listen'
import { readTwilioWebhook } from '@/lib/twilio'

export const dynamic = 'force-dynamic'

/** The listen-in media stream's status (stream-started / stream-stopped / stream-error): once it's over, forget it. */
export async function POST(req: Request): Promise<Response> {
  const p = await readTwilioWebhook(req, 'stream')
  if (!p) return new Response('Forbidden', { status: 403 })
  const callId = new URL(req.url).searchParams.get('callId')
  if (callId && /^[a-z0-9]{20,40}$/i.test(callId)) {
    if (p.StreamEvent === 'stream-stopped' || p.StreamEvent === 'stream-error') await streamEnded(callId, p.StreamSid)
    if (p.StreamEvent === 'stream-error') console.error('[listen] stream error', callId, p.StreamError ?? '')
  }
  return new Response(null, { status: 204 })
}
