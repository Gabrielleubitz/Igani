import { NextResponse } from 'next/server'
import { handleWebhook, verifyTokenOk, webhookSignatureOk } from '@/lib/instagram-dm'

export const dynamic = 'force-dynamic'

/** Meta checks the webhook once when it's set up: echo the challenge if the verify token matches. */
export async function GET(req: Request): Promise<Response> {
  const u = new URL(req.url)
  if (u.searchParams.get('hub.mode') === 'subscribe' && verifyTokenOk(u.searchParams.get('hub.verify_token'))) return new Response(u.searchParams.get('hub.challenge') ?? '', { status: 200 })
  return new Response('Forbidden', { status: 403 })
}

/** New Instagram DMs (signed by Meta with the app secret). */
export async function POST(req: Request): Promise<NextResponse> {
  const raw = await req.text()
  if (!webhookSignatureOk(raw, req.headers.get('x-hub-signature-256'))) return NextResponse.json({ error: 'Bad signature' }, { status: 401 })
  try {
    await handleWebhook(JSON.parse(raw))
  } catch (e) {
    console.error('[instagram] webhook failed', e instanceof Error ? e.message : e)
  }
  // always 200 so Meta doesn't retry forever; failures are logged
  return NextResponse.json({ ok: true })
}
