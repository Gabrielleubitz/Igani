import { updateSmsStatus } from '@/lib/sms'
import { readTwilioWebhook } from '@/lib/twilio'

export const dynamic = 'force-dynamic'

/** Delivery reports for texts we sent (queued → sent → delivered / undelivered / failed). */
export async function POST(req: Request): Promise<Response> {
  const p = await readTwilioWebhook(req, 'sms-status')
  if (!p) return new Response('Forbidden', { status: 403 })
  const id = new URL(req.url).searchParams.get('callId')
  if (id) await updateSmsStatus(id, p)
  return new Response(null, { status: 204 })
}
