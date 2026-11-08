import 'server-only'
import { logActivity } from './audit'
import { FINAL_STATUSES, MAX_CALL_MIN, advanceCall } from './calls'
import { prisma } from './prisma'
import { getSetting } from './settings'
import { twilioClient, twilioConfig, voiceUrl } from './twilio'

/**
 * Listening in. With Settings → Phone → "Allow listening in" on, an outgoing call is a Twilio conference room instead
 * of a direct bridge: the rep's app joins the room, and once the room starts we dial the client into it. An admin can
 * then join the same room muted and without a beep, so neither side hears or sees them.
 *
 * Who decides what: the client's leg (status webhook) is the truth for ringing/answered/ended, exactly as before.
 * The rep's leg only says "the room is over".
 */

export const roomName = (callId: string): string => `igani-call-${callId}`

/** The room just started (the rep is in it): ring the client into it, once. */
export async function dialClientIntoRoom(callId: string, conferenceSid: string): Promise<void> {
  const c = twilioConfig()
  if (!c) return
  // claim the room for this call exactly once (Twilio can repeat webhooks)
  const claimed = await prisma.call.updateMany({ where: { id: callId, conference: true, conferenceSid: null }, data: { conferenceSid } })
  if (!claimed.count) return
  const call = await prisma.call.findUnique({ where: { id: callId } })
  if (!call || FINAL_STATUSES.includes(call.status)) return
  const record = await getSetting('voice.record')
  try {
    const p = await twilioClient(c)
      .conferences(conferenceSid)
      .participants.create({
        from: call.fromNumber,
        to: call.toNumber,
        earlyMedia: true, // the rep hears the real ringing
        beep: 'false',
        startConferenceOnEnter: true,
        endConferenceOnExit: true, // the client hanging up ends the room (and the rep's leg)
        timeout: 40,
        timeLimit: MAX_CALL_MIN * 60,
        statusCallback: voiceUrl('status', callId),
        statusCallbackMethod: 'POST',
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        ...(record ? { record: true, recordingChannels: 'dual', recordingStatusCallback: voiceUrl('recording', callId), recordingStatusCallbackMethod: 'POST', recordingStatusCallbackEvent: ['completed', 'absent'] } : {}),
      })
    await advanceCall(callId, { status: 'INITIATED', childCallSid: p.callSid })
  } catch (err) {
    console.error('[conference] could not dial the client', err instanceof Error ? err.message : err)
    await advanceCall(callId, { status: 'FAILED' })
    await endRoom(conferenceSid)
  }
}

/** End the room (and so the rep's leg). Used when the client's leg ends without ever joining (busy, no answer…). */
export async function endRoom(conferenceSid: string | null | undefined): Promise<void> {
  const c = twilioConfig()
  if (!c || !conferenceSid) return
  await twilioClient(c)
    .conferences(conferenceSid)
    .update({ status: 'completed' })
    .catch(() => undefined) // already over
}

/** The room ended (the rep hung up first): stop the client's phone ringing if it still is. */
export async function roomEnded(callId: string): Promise<void> {
  const c = twilioConfig()
  const call = await prisma.call.findUnique({ where: { id: callId } })
  if (!c || !call || FINAL_STATUSES.includes(call.status)) return
  if (!call.childCallSid) {
    await advanceCall(callId, { status: 'CANCELED' })
    return
  }
  const leg = twilioClient(c).calls(call.childCallSid)
  await leg.update({ status: 'canceled' }).catch(() => leg.update({ status: 'completed' }).catch(() => undefined))
}

/** An admin joins a live call's room: muted, no beep, and the room doesn't wait for or end with them. */
export async function canListen(callId: string, userId: string): Promise<{ ok: true; call: { id: string; userId: string | null } } | { ok: false }> {
  const call = await prisma.call.findUnique({ where: { id: callId }, select: { id: true, userId: true, conference: true, conferenceSid: true, status: true } })
  if (!call?.conference || !call.conferenceSid || FINAL_STATUSES.includes(call.status) || call.userId === userId) return { ok: false }
  // kept in the audit log: who listened to whose call
  await logActivity({ actorId: userId, entityType: 'USER', entityId: call.userId ?? userId, action: 'call.listened', metadata: { callId: call.id } }).catch(() => undefined)
  return { ok: true, call }
}
