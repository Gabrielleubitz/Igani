import { SETTING_DEFAULTS, getSetting } from '@/lib/settings'
import { readTwilioWebhook, twiml } from '@/lib/twilio'

export const dynamic = 'force-dynamic'

/** Played to the person called as they answer (before connecting): the recording consent message. */
export async function POST(req: Request): Promise<Response> {
  const p = await readTwilioWebhook(req, 'whisper')
  if (!p) return new Response('Forbidden', { status: 403 })
  const r = twiml()
  if (await getSetting('voice.record')) r.say((await getSetting('voice.consentMessage')).trim() || SETTING_DEFAULTS['voice.consentMessage'])
  return new Response(r.toString(), { headers: { 'content-type': 'text/xml; charset=utf-8' } })
}
