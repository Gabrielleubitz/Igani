import { getSetting } from '@/lib/settings'
import { readTwilioWebhook, twiml } from '@/lib/twilio'

export const dynamic = 'force-dynamic'

/** Played to the person called as they answer (before connecting): the recording consent message. */
export async function POST(req: Request): Promise<Response> {
  const p = await readTwilioWebhook(req, 'whisper')
  if (!p) return new Response('Forbidden', { status: 403 })
  const r = twiml()
  const consent = (await getSetting('voice.record')) ? await getSetting('voice.consentMessage') : ''
  if (consent) r.say(consent)
  return new Response(r.toString(), { headers: { 'content-type': 'text/xml; charset=utf-8' } })
}
