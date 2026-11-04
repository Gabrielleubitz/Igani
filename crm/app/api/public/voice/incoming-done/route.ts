import { advanceCall, createMissedCallTask, fromTwilioStatus } from '@/lib/calls'
import { prisma } from '@/lib/prisma'
import { readTwilioWebhook, twiml, voiceUrl } from '@/lib/twilio'

export const dynamic = 'force-dynamic'

/** The ringing ended. Answered: done. Not answered (or already on a call): voicemail and a "Call back" task. */
export async function POST(req: Request): Promise<Response> {
  const p = await readTwilioWebhook(req, 'incoming-done')
  if (!p) return new Response('Forbidden', { status: 403 })
  const callId = new URL(req.url).searchParams.get('callId') ?? ''
  const call = await prisma.call.findUnique({ where: { id: callId }, select: { id: true, direction: true, answeredAt: true } })
  const r = twiml()
  if (!call || call.direction !== 'INBOUND') {
    r.hangup()
    return new Response(r.toString(), { headers: { 'content-type': 'text/xml; charset=utf-8' } })
  }
  const status = fromTwilioStatus(p.DialCallStatus)
  const answered = status === 'COMPLETED' || status === 'IN_PROGRESS' || Boolean(call.answeredAt)
  if (answered) {
    const d = Number.parseInt(p.DialCallDuration ?? '', 10)
    await advanceCall(call.id, { status: 'COMPLETED', durationSec: Number.isFinite(d) ? d : null })
    r.hangup()
  } else {
    await advanceCall(call.id, { status: 'NO_ANSWER' })
    await createMissedCallTask(call.id).catch((err: unknown) => console.error('[incoming] callback task failed', call.id, err))
    r.say('Hi, you have reached Igani. We can’t take your call right now. Please leave a message after the tone, and we will call you back.')
    r.record({ maxLength: 120, playBeep: true, trim: 'trim-silence', action: voiceUrl('voicemail-done', call.id), method: 'POST', recordingStatusCallback: voiceUrl('recording', call.id), recordingStatusCallbackMethod: 'POST', recordingStatusCallbackEvent: ['completed', 'absent'] })
  }
  return new Response(r.toString(), { headers: { 'content-type': 'text/xml; charset=utf-8' } })
}
