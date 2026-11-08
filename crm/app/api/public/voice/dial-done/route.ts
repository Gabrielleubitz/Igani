import { advanceCall, fromTwilioStatus } from '@/lib/calls'
import { prisma } from '@/lib/prisma'
import { readTwilioWebhook, twiml } from '@/lib/twilio'

export const dynamic = 'force-dynamic'

/** The <Dial> finished (the other side hung up, didn't answer, was busy…). Final status, then end the browser leg. */
export async function POST(req: Request): Promise<Response> {
  const p = await readTwilioWebhook(req, 'dial-done')
  if (!p) return new Response('Forbidden', { status: 403 })
  const callId = new URL(req.url).searchParams.get('callId')
  const status = fromTwilioStatus(p.DialCallStatus)
  // A listen-in call's room ended: the client's leg (status webhook) already says how the call went
  const room = callId ? await prisma.call.findUnique({ where: { id: callId }, select: { conference: true } }) : null
  if (room?.conference) {
    const r = twiml()
    r.hangup()
    return new Response(r.toString(), { headers: { 'content-type': 'text/xml; charset=utf-8' } })
  }
  if (callId && status) {
    const duration = p.DialCallDuration ? Number.parseInt(p.DialCallDuration, 10) : null
    await advanceCall(callId, { status: status === 'IN_PROGRESS' ? 'COMPLETED' : status, durationSec: Number.isFinite(duration) ? duration : null })
  }
  const r = twiml()
  r.hangup()
  return new Response(r.toString(), { headers: { 'content-type': 'text/xml; charset=utf-8' } })
}
