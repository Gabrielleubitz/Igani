import 'server-only'
import { Prisma, type CallStatus } from '@prisma/client'
import { logActivity } from './audit'
import { leadName } from './format'
import { formatPhone, toE164 } from './phone-numbers'
import { phoneMatchSql } from './phone-match'
import { prisma } from './prisma'
import { fetchTwilioCall, twilioConfig } from './twilio'

/** Calls that are over. A call only ever moves forward, and never out of one of these. */
export const FINAL_STATUSES: readonly CallStatus[] = ['COMPLETED', 'BUSY', 'NO_ANSWER', 'FAILED', 'CANCELED']
export const LIVE_STATUSES: readonly CallStatus[] = ['INITIATED', 'RINGING', 'IN_PROGRESS']
const RANK: Record<CallStatus, number> = { INITIATED: 0, RINGING: 1, IN_PROGRESS: 2, COMPLETED: 3, BUSY: 3, NO_ANSWER: 3, FAILED: 3, CANCELED: 3 }

/** Twilio call / dial status → ours. */
export function fromTwilioStatus(s: string | undefined | null): CallStatus | null {
  switch ((s ?? '').toLowerCase()) {
    case 'queued':
    case 'initiated':
      return 'INITIATED'
    case 'ringing':
      return 'RINGING'
    case 'in-progress':
    case 'answered':
      return 'IN_PROGRESS'
    case 'completed':
      return 'COMPLETED'
    case 'busy':
      return 'BUSY'
    case 'no-answer':
      return 'NO_ANSWER'
    case 'failed':
      return 'FAILED'
    case 'canceled':
      return 'CANCELED'
    default:
      return null
  }
}

/** Wrap-up outcomes a salesperson picks after a call. */
export const CALL_OUTCOMES = {
  /** call lists: the call went well, the business becomes a lead */
  interested: 'Interested · made a lead',
  connected: 'Connected',
  voicemail: 'Left voicemail',
  no_answer: 'No answer',
  busy: 'Busy',
  callback: 'Call back later',
  not_interested: 'Not interested',
  wrong_number: 'Wrong number',
} as const
export type CallOutcome = keyof typeof CALL_OUTCOMES

/** The outcome the wrap-up suggests from how the call ended. */
export function suggestedOutcome(status: CallStatus, answered: boolean): CallOutcome {
  if (answered) return 'connected'
  return status === 'BUSY' ? 'busy' : 'no_answer'
}

export const fmtDuration = (sec: number | null | undefined): string => {
  const s = Math.max(0, Math.round(sec ?? 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Moves a call forward (never back). On reaching a final status it records the end time and talk time and, once only,
 * logs "call ended" on the lead's timeline. Safe to call from every webhook in any order and more than once.
 */
export async function advanceCall(callId: string, update: { status: CallStatus; childCallSid?: string | null; durationSec?: number | null; at?: Date }): Promise<void> {
  const at = update.at ?? new Date()
  const call = await prisma.call.findUnique({ where: { id: callId } })
  if (!call) return
  if (RANK[update.status] < RANK[call.status] || (RANK[update.status] === RANK[call.status] && update.status === call.status && !update.durationSec)) {
    if (update.childCallSid && !call.childCallSid) await prisma.call.update({ where: { id: callId }, data: { childCallSid: update.childCallSid } })
    return
  }
  const final = FINAL_STATUSES.includes(update.status)
  const data: Prisma.CallUpdateInput = {
    status: update.status,
    ...(update.childCallSid && !call.childCallSid ? { childCallSid: update.childCallSid } : {}),
    ...(update.status === 'IN_PROGRESS' && !call.answeredAt ? { answeredAt: at } : {}),
    ...(final ? { endedAt: call.endedAt ?? at, durationSec: update.durationSec ?? (call.answeredAt ? Math.round((at.getTime() - call.answeredAt.getTime()) / 1000) : 0) } : {}),
  }
  // Only the request that actually moves it to a final status logs the end (guards against duplicate webhooks)
  const moved = await prisma.call.updateMany({ where: { id: callId, status: { notIn: [...FINAL_STATUSES] } }, data: data as Prisma.CallUpdateManyMutationInput })
  if (!moved.count) return
  if (final && call.leadId) {
    const answered = Boolean(call.answeredAt) || update.status === 'COMPLETED'
    const durationSec = (data.durationSec as number | undefined) ?? 0
    await logActivity({ entityType: 'LEAD', entityId: call.leadId, actorId: call.userId, action: 'call.ended', metadata: { callId, direction: call.direction, status: update.status, answered: answered && durationSec > 0, durationSec, to: call.toNumber, from: call.fromNumber } })
  }
}

/**
 * Leads whose phone number contains these digits, however it's written ("+972 53 231 5090", "053-231-5090").
 * Only ids: the caller applies who-may-see-what on top.
 */
export async function leadIdsByPhoneDigits(digits: string, limit = 200): Promise<string[]> {
  const d = digits.replace(/\D/g, '')
  if (d.length < 3) return []
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Lead" WHERE regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') LIKE ${'%' + d + '%'} LIMIT ${limit}`
  return rows.map((r) => r.id)
}

/** Leads whose phone is this number however it was written (oldest first). Only ids: the caller applies who-may-see-what. */
export async function leadIdsForNumber(phone: string, limit = 20): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "Lead" WHERE phone IS NOT NULL AND ${phoneMatchSql(Prisma.sql`phone`, phone)} ORDER BY "createdAt" ASC LIMIT ${limit}`
  return rows.map((r) => r.id)
}

/** A lead this user may call whose phone number is this one (so a typed number still lands on the right timeline). */
export async function leadForNumber(e164: string, where: Prisma.LeadWhereInput): Promise<{ id: string; name: string } | null> {
  const ids = await leadIdsForNumber(e164)
  if (!ids.length) return null
  const candidates = await prisma.lead.findMany({ where: { AND: [where, { id: { in: ids } }] }, select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true }, orderBy: { createdAt: 'asc' } })
  const hit = candidates[0]
  return hit ? { id: hit.id, name: leadName(hit) } : null
}

/** Per person: calls a minute and a day (stops a stolen session or a script from running up the phone bill). */
export const CALL_LIMITS = { perMinute: 6, perDay: 300 }

/**
 * If a call still looks live in the CRM, ask Twilio whether it really is (a final callback can get lost). Closes it
 * with Twilio's own result when it's over. Without Twilio's answer, a call is only closed once it's clearly stale.
 * Returns true when the call is still live.
 */
export async function reconcileCall(callId: string): Promise<boolean> {
  const call = await prisma.call.findUnique({ where: { id: callId } })
  if (!call || FINAL_STATUSES.includes(call.status)) return false
  const ageMin = (Date.now() - call.startedAt.getTime()) / 60_000
  const c = twilioConfig()
  if (call.simulated || !call.twilioCallSid) {
    // never reached Twilio (or a demo call): over once it's a few minutes old
    // (a demo call can't outlive its page, so one a minute old with no word from the browser is over)
    if (ageMin > (call.simulated ? 1 : 2)) {
      await advanceCall(call.id, { status: call.answeredAt ? 'COMPLETED' : call.status === 'INITIATED' ? 'FAILED' : 'NO_ANSWER' })
      return false
    }
    return true
  }
  if (c) {
    const leg = await fetchTwilioCall(c, call.childCallSid ?? call.twilioCallSid)
    const status = leg ? fromTwilioStatus(leg.status) : null
    if (status && FINAL_STATUSES.includes(status)) {
      await advanceCall(call.id, { status: status === 'COMPLETED' && !call.answeredAt && call.childCallSid === null ? 'CANCELED' : status, durationSec: leg?.duration ?? null })
      return false
    }
    if (status) return true
  }
  // Twilio couldn't be asked: calls can't run past the time limit, so anything older is over
  if (ageMin > MAX_CALL_MIN + 5) {
    await advanceCall(call.id, { status: call.answeredAt ? 'COMPLETED' : 'NO_ANSWER' })
    return false
  }
  return true
}

/** Longest a single call may run (Twilio hangs up at this point). */
export const MAX_CALL_MIN = 90

/**
 * A missed incoming call becomes a "Call back …" task for the line's owner, once: on the contact if we know who
 * called, otherwise on the owner's own list.
 */
export async function createMissedCallTask(callId: string): Promise<void> {
  const call = await prisma.call.findUnique({ where: { id: callId }, include: { lead: { select: { id: true, firstName: true, lastName: true, email: true } } } })
  if (!call || call.direction !== 'INBOUND' || !call.userId) return
  const done = await prisma.activityLog.findFirst({ where: { action: 'task.created', metadata: { path: ['callId'], equals: callId } }, select: { id: true } })
  if (done) return
  const { randomUUID } = await import('node:crypto')
  const who = call.lead ? leadName(call.lead) : formatPhone(call.fromNumber)
  const title = `Call back ${who} (missed call)`
  const { pushLater } = await import('./push')
  pushLater([call.userId], 'calls', { title: 'Missed call', body: `${who} called your Igani line.`, thread: 'calls', category: 'MISSED_CALL', collapseId: `missed-${call.id}`, data: { type: 'missed', number: call.fromNumber, name: call.lead ? who : null, leadId: call.lead?.id ?? null } })
  if (call.lead) {
    const { createAutoTask } = await import('./tasks')
    await createAutoTask({ leadId: call.lead.id, title, dueAt: new Date(), assigneeId: call.userId, priority: 'HIGH', auto: 'callback', callId })
  } else {
    await logActivity({ entityType: 'USER', entityId: call.userId, action: 'task.created', metadata: { taskId: randomUUID(), title, dueAt: new Date().toISOString(), assigneeId: call.userId, priority: 'HIGH', auto: 'team', callId } })
  }
}
