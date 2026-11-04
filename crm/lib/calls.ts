import 'server-only'
import type { CallStatus, Prisma } from '@prisma/client'
import { logActivity } from './audit'
import { leadName } from './format'
import { toE164 } from './phone-numbers'
import { prisma } from './prisma'

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

/** A lead this user may call whose phone number is this one (so a typed number still lands on the right timeline). */
export async function leadForNumber(e164: string, where: Prisma.LeadWhereInput): Promise<{ id: string; name: string } | null> {
  const tail = e164.replace(/\D/g, '').slice(-7)
  const candidates = await prisma.lead.findMany({ where: { AND: [where, { phone: { contains: tail.slice(-4) } }] }, select: { id: true, firstName: true, lastName: true, email: true, phone: true }, take: 50, orderBy: { updatedAt: 'desc' } })
  const hit = candidates.find((l) => l.phone && toE164(l.phone) === e164)
  return hit ? { id: hit.id, name: leadName(hit) } : null
}
