/**
 * Text messages through each teammate's Twilio number (the dialer's Messages tab). Incoming texts arrive on the
 * signed `sms` webhook and are filed under the line's owner; outgoing ones are sent from the sender's own line.
 * Both land on the contact's timeline when the number is one of the sender's contacts.
 */
import 'server-only'
import { logActivity } from './audit'
import { BookingError } from './bookings'
import { leadIdsForNumber } from './calls'
import { callBlockedByOwner } from './call-status'
import { canSeeLead } from './lead-access'
import { dialProblem, toE164 } from './phone-numbers'
import { prisma } from './prisma'
import { getSetting } from './settings'
import { SMS_MAX, smsStatus, smsStatusAdvances } from './sms-core'
import { dialerDemo, sendTwilioSms, twilioConfig, voiceUrl } from './twilio'

type Sender = { id: string; role: 'ADMIN' | 'SALES' | 'MARKETING' }

/** Per person: texts a minute and a day (stops a script or a stuck button from spamming or running up the bill). */
export const SMS_LIMITS = { perMinute: 10, perDay: 200 }

/**
 * The contact a message to or from this number belongs to, for this teammate: the oldest lead with the number they
 * may see. `owner` is someone else's lead with that number (texting it is refused, like calling it).
 */
export async function leadForSms(e164: string, user: Sender): Promise<{ leadId: string | null; blockedBy: string | null }> {
  const ids = await leadIdsForNumber(e164)
  if (!ids.length) return { leadId: null, blockedBy: null }
  const leads = await prisma.lead.findMany({ where: { id: { in: ids } }, select: { id: true, assignedToId: true, createdAt: true, assignedTo: { select: { name: true, email: true } } }, orderBy: { createdAt: 'asc' } })
  const mine = leads.find((l) => canSeeLead(user, l))
  if (mine) return { leadId: mine.id, blockedBy: null }
  const theirs = leads.find((l) => callBlockedByOwner(l, user))
  return { leadId: null, blockedBy: theirs ? (theirs.assignedTo?.name || theirs.assignedTo?.email || 'another teammate') : null }
}

/** A text came in on one of our numbers (Twilio webhook params). Stored once per Twilio message. */
export async function recordIncomingSms(p: Record<string, string>): Promise<{ id: string } | null> {
  const line = await prisma.phoneLine.findUnique({ where: { number: p.To ?? '' }, include: { user: { select: { id: true, role: true } } } })
  if (!line?.active || (line.user.role !== 'ADMIN' && line.user.role !== 'SALES')) return null
  const sid = p.MessageSid || p.SmsSid || null
  if (sid) {
    const dup = await prisma.smsMessage.findUnique({ where: { twilioSid: sid }, select: { id: true } })
    if (dup) return dup
  }
  const from = toE164(p.From ?? '') ?? (p.From ?? 'unknown').slice(0, 32)
  const media = Math.max(0, Math.min(10, Number.parseInt(p.NumMedia ?? '0', 10) || 0))
  const body = (p.Body ?? '').slice(0, SMS_MAX * 2)
  const { leadId } = await leadForSms(from, { id: line.user.id, role: line.user.role })
  try {
    const msg = await prisma.smsMessage.create({ data: { userId: line.user.id, leadId, direction: 'INBOUND', lineNumber: line.number, otherNumber: from, body, media, twilioSid: sid, status: 'received' } })
    if (leadId) await logActivity({ entityType: 'LEAD', entityId: leadId, actorId: null, action: 'sms.received', metadata: { messageId: msg.id, from, to: line.number, body: body.slice(0, 1000), media } })
    return { id: msg.id }
  } catch (err) {
    // the same message delivered twice at once
    if (typeof err === 'object' && err && 'code' in err && (err as { code: unknown }).code === 'P2002' && sid) return prisma.smsMessage.findUnique({ where: { twilioSid: sid }, select: { id: true } })
    throw err
  }
}

/** Twilio's delivery report for a text we sent. */
export async function updateSmsStatus(messageId: string, p: Record<string, string>): Promise<void> {
  const status = smsStatus(p.MessageStatus ?? p.SmsStatus)
  if (!status) return
  const msg = await prisma.smsMessage.findUnique({ where: { id: messageId }, select: { status: true, direction: true, twilioSid: true } })
  if (!msg || msg.direction !== 'OUTBOUND' || (msg.twilioSid && p.MessageSid && msg.twilioSid !== p.MessageSid)) return
  if (!smsStatusAdvances(msg.status, status)) return
  await prisma.smsMessage.update({ where: { id: messageId }, data: { status, ...(p.ErrorCode ? { error: `Twilio error ${p.ErrorCode.slice(0, 10)}` } : {}) } })
}

/** Plain words for Twilio's usual refusals. */
function sendError(err: unknown): string {
  const code = typeof err === 'object' && err && 'code' in err ? Number((err as { code: unknown }).code) : 0
  const known: Record<number, string> = {
    21211: 'That isn’t a valid phone number.',
    21408: 'Texting this country isn’t enabled in Twilio (Messaging geo permissions).',
    21606: 'This number can’t send texts. Check that it has SMS in Twilio.',
    21610: 'They replied STOP, so they can’t be texted from this number.',
    21612: 'Twilio can’t text this number from your line.',
    21614: 'That number can’t receive texts (it may be a landline).',
    20003: 'Twilio refused the CRM’s key. An admin needs to update the Twilio API key.',
  }
  return known[code] ?? (err instanceof Error ? `Twilio: ${err.message.slice(0, 200)}` : 'The text couldn’t be sent.')
}

/** Send a text from the sender's own line. Returns the stored message (status `failed` with a reason if Twilio refused). */
export async function sendSms(user: Sender, input: { to: string; body: string }) {
  const body = input.body.trim()
  if (!body) throw new BookingError('Write a message first.', 'INVALID_STATE')
  if (body.length > SMS_MAX) throw new BookingError(`That’s too long for a text (${SMS_MAX} characters at most).`, 'INVALID_STATE')
  const demo = dialerDemo()
  const line = await prisma.phoneLine.findUnique({ where: { userId: user.id } })
  if (!demo && !line?.active) throw new BookingError('You don’t have a phone line yet. Ask an admin to assign you a number.', 'FORBIDDEN')
  const to = toE164(input.to)
  const problem = dialProblem(to, await getSetting('voice.countries'))
  if (problem || !to) throw new BookingError(problem?.replace('Calls to', 'Texts to').replace('called', 'texted') ?? 'That doesn’t look like a phone number.', 'INVALID_STATE')
  const [lastMinute, today] = await Promise.all([
    prisma.smsMessage.count({ where: { userId: user.id, direction: 'OUTBOUND', createdAt: { gt: new Date(Date.now() - 60_000) } } }),
    prisma.smsMessage.count({ where: { userId: user.id, direction: 'OUTBOUND', createdAt: { gt: new Date(Date.now() - 86_400_000) } } }),
  ])
  if (lastMinute >= SMS_LIMITS.perMinute) throw new BookingError('That’s a lot of texts in a minute. Wait a moment and try again.', 'SLOT_TAKEN')
  if (today >= SMS_LIMITS.perDay) throw new BookingError(`You’ve reached the limit of ${SMS_LIMITS.perDay} texts in 24 hours. Ask an admin if you need more.`, 'SLOT_TAKEN')
  const { leadId, blockedBy } = await leadForSms(to, user)
  if (blockedBy) throw new BookingError(`This number is ${blockedBy}’s lead, so you can’t text it.`, 'FORBIDDEN')

  const from = line?.number ?? '+15005550006'
  const msg = await prisma.smsMessage.create({ data: { userId: user.id, leadId, direction: 'OUTBOUND', lineNumber: from, otherNumber: to, body, status: 'queued' } })
  let saved = msg
  const c = twilioConfig()
  if (demo || !c) {
    saved = await prisma.smsMessage.update({ where: { id: msg.id }, data: { status: 'delivered' } })
  } else {
    try {
      const sent = await sendTwilioSms(c, { from, to, body, statusCallback: voiceUrl('sms-status', msg.id) })
      const status = smsStatus(sent.status) ?? 'queued'
      saved = await prisma.smsMessage.update({ where: { id: msg.id }, data: { twilioSid: sent.sid, status } })
    } catch (err) {
      console.error('[sms] send failed', err)
      saved = await prisma.smsMessage.update({ where: { id: msg.id }, data: { status: 'failed', error: sendError(err) } })
    }
  }
  if (leadId && saved.status !== 'failed') await logActivity({ entityType: 'LEAD', entityId: leadId, actorId: user.id, action: 'sms.sent', metadata: { messageId: msg.id, to, from, body: body.slice(0, 1000) } })
  return saved
}
