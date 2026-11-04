import { advanceCall } from '@/lib/calls'
import { dialProblem } from '@/lib/phone-numbers'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'
import { readTwilioWebhook, twiml, userIdFromClient, voiceUrl } from '@/lib/twilio'

export const dynamic = 'force-dynamic'

const xml = (body: string, status = 200): Response => new Response(body, { status, headers: { 'content-type': 'text/xml; charset=utf-8' } })
const refuse = (message = 'Sorry, this call cannot be placed.'): Response => {
  const r = twiml()
  r.say(message)
  r.hangup()
  return xml(r.toString())
}

/**
 * Twilio asks what to do when the browser starts a call (TwiML App voice URL). We only dial for a call row that the
 * same user created in the last two minutes, that hasn't been used yet, to a number we allow, from their own line.
 */
export async function POST(req: Request): Promise<Response> {
  const p = await readTwilioWebhook(req, 'twiml')
  if (!p) return new Response('Forbidden', { status: 403 })
  const userId = userIdFromClient(p.From)
  const callId = p.callId
  if (!userId || !callId || !/^[a-z0-9]{20,40}$/i.test(callId)) return refuse()

  const call = await prisma.call.findUnique({ where: { id: callId }, include: { user: { select: { phoneLine: true, role: true } } } })
  const fresh = call && Date.now() - call.startedAt.getTime() < 2 * 60_000
  if (!call || call.userId !== userId || call.direction !== 'OUTBOUND' || call.status !== 'INITIATED' || call.twilioCallSid || !fresh || call.simulated) return refuse()
  const line = call.user.phoneLine
  if (!line?.active || line.number !== call.fromNumber || !(call.user.role === 'ADMIN' || call.user.role === 'SALES')) return refuse('Your phone line is not active. Ask an admin.')
  if (dialProblem(call.toNumber, await getSetting('voice.countries'))) {
    await advanceCall(call.id, { status: 'FAILED' })
    return refuse('This number cannot be called from the CRM.')
  }
  // Claim the call for this Twilio leg (a replayed request can't dial twice)
  const claimed = await prisma.call.updateMany({ where: { id: call.id, twilioCallSid: null }, data: { twilioCallSid: p.CallSid } })
  if (!claimed.count) return refuse()

  const [record, consent] = await Promise.all([getSetting('voice.record'), getSetting('voice.consentMessage')])
  const r = twiml()
  const dial = r.dial({
    callerId: line.number,
    answerOnBridge: true, // the browser keeps hearing the real ringing, and "answered" means the person picked up
    timeLimit: 2 * 3600,
    timeout: 40,
    action: voiceUrl('dial-done', call.id),
    method: 'POST',
    ...(record ? { record: 'record-from-answer-dual' as const, recordingStatusCallback: voiceUrl('recording', call.id), recordingStatusCallbackMethod: 'POST' as const, recordingStatusCallbackEvent: ['completed', 'absent'] } : {}),
  })
  dial.number(
    {
      statusCallback: voiceUrl('status', call.id),
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      // Recording consent: the person called hears it right after answering, before the two sides are connected
      ...(record && consent ? { url: voiceUrl('whisper', call.id), method: 'POST' as const } : {}),
    },
    call.toNumber,
  )
  return xml(r.toString())
}
