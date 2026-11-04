import { readTwilioWebhook, twiml } from '@/lib/twilio'

export const dynamic = 'force-dynamic'

/** After the voicemail: thank the caller and hang up (the recording itself arrives on the recording callback). */
export async function POST(req: Request): Promise<Response> {
  const p = await readTwilioWebhook(req, 'voicemail-done')
  if (!p) return new Response('Forbidden', { status: 403 })
  const r = twiml()
  r.say('Thank you. Goodbye.')
  r.hangup()
  return new Response(r.toString(), { headers: { 'content-type': 'text/xml; charset=utf-8' } })
}
