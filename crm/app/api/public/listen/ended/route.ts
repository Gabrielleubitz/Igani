import { listenRelay, stopStream, verifyRelaySignature } from '@/lib/listen'

export const dynamic = 'force-dynamic'

/** The relay says the last listener left a call: stop forking its audio. Signed by the relay with the shared secret. */
export async function POST(req: Request): Promise<Response> {
  const relay = listenRelay()
  if (!relay) return new Response('Not configured', { status: 503 })
  const raw = await req.text().catch(() => '')
  if (raw.length > 2000 || !verifyRelaySignature(relay.secret, raw, req.headers.get('x-listen-signature'))) return new Response('Forbidden', { status: 403 })
  let body: { callId?: unknown; at?: unknown }
  try {
    body = JSON.parse(raw) as { callId?: unknown; at?: unknown }
  } catch {
    return new Response('Bad request', { status: 400 })
  }
  const callId = typeof body.callId === 'string' && /^[a-z0-9]{20,40}$/i.test(body.callId) ? body.callId : null
  const at = typeof body.at === 'number' ? body.at : 0
  if (!callId || Math.abs(Date.now() - at) > 5 * 60_000) return new Response('Bad request', { status: 400 })
  const stopped = await stopStream(callId)
  return Response.json({ ok: true, stopped })
}
