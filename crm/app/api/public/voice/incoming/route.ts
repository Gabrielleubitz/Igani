import { LIVE_STATUSES, leadForNumber } from '@/lib/calls'
import { leadScope } from '@/lib/lead-access'
import { toE164 } from '@/lib/phone-numbers'
import { prisma } from '@/lib/prisma'
import { SETTING_DEFAULTS, getSetting } from '@/lib/settings'
import { identityFor, readTwilioWebhook, twiml, voiceUrl } from '@/lib/twilio'

export const dynamic = 'force-dynamic'

const xml = (r: { toString(): string }): Response => new Response(r.toString(), { headers: { 'content-type': 'text/xml; charset=utf-8' } })

/**
 * Someone called one of our numbers (the number's Voice URL in Twilio). Rings the line owner's browser (every CRM tab
 * they have open) for 25 seconds; if they're already on a call or don't answer, the caller can leave a voicemail.
 */
export async function POST(req: Request): Promise<Response> {
  const p = await readTwilioWebhook(req, 'incoming')
  if (!p) return new Response('Forbidden', { status: 403 })
  const to = p.To ?? ''
  const from = toE164(p.From ?? '') ?? (p.From ?? '').slice(0, 32)
  const line = await prisma.phoneLine.findUnique({ where: { number: to }, include: { user: { select: { id: true, role: true } } } })
  if (!line?.active || !line.user.role || (line.user.role !== 'ADMIN' && line.user.role !== 'SALES')) {
    const r = twiml()
    r.say('Sorry, this number is not in service.')
    r.hangup()
    return xml(r)
  }
  const owner = { id: line.user.id, role: line.user.role }
  const lead = /^\+\d{8,15}$/.test(from) ? await leadForNumber(from, leadScope(owner)) : null
  // A retried webhook for the same Twilio call reuses its row
  const existing = await prisma.call.findUnique({ where: { twilioCallSid: p.CallSid ?? '' } })
  const call =
    existing ??
    (await prisma.call.create({ data: { userId: owner.id, leadId: lead?.id ?? null, direction: 'INBOUND', status: 'RINGING', fromNumber: from || 'unknown', toNumber: to, twilioCallSid: p.CallSid ?? null } }))

  const busy = await prisma.call.findFirst({ where: { userId: owner.id, id: { not: call.id }, status: { in: [...LIVE_STATUSES] }, twilioCallSid: { not: null }, startedAt: { gt: new Date(Date.now() - 2 * 3600_000) } }, select: { id: true } })
  const [record, consentSetting] = await Promise.all([getSetting('voice.record'), getSetting('voice.consentMessage')])
  const r = twiml()
  if (record) r.say((consentSetting.trim() || SETTING_DEFAULTS['voice.consentMessage']).slice(0, 300))
  if (busy) {
    // already on another call: straight to voicemail
    r.redirect({ method: 'POST' }, voiceUrl('incoming-done', call.id))
    return xml(r)
  }
  const dial = r.dial({
    timeout: 25,
    answerOnBridge: true,
    action: voiceUrl('incoming-done', call.id),
    method: 'POST',
    ...(record ? { record: 'record-from-answer-dual' as const, recordingStatusCallback: voiceUrl('recording', call.id), recordingStatusCallbackMethod: 'POST' as const, recordingStatusCallbackEvent: ['completed', 'absent'] } : {}),
  })
  const client = dial.client({ statusCallback: voiceUrl('status', call.id), statusCallbackMethod: 'POST', statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'] })
  client.identity(identityFor(owner.id))
  client.parameter({ name: 'callId', value: call.id })
  return xml(r)
}
