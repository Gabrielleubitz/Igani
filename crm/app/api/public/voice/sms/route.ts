import { recordIncomingSms } from '@/lib/sms'
import { readTwilioWebhook } from '@/lib/twilio'

export const dynamic = 'force-dynamic'

/** A text to one of our numbers (the number's Messaging webhook in Twilio): filed in the line owner's Messages tab. */
export async function POST(req: Request): Promise<Response> {
  const p = await readTwilioWebhook(req, 'sms')
  if (!p) return new Response('Forbidden', { status: 403 })
  await recordIncomingSms(p)
  // no automatic reply
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', { headers: { 'content-type': 'text/xml; charset=utf-8' } })
}
