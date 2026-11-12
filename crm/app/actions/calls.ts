'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { requireUser, type SessionUser } from '@/lib/auth'
import { identifyNumber, type CallerId } from '@/lib/caller-id'
import { BookingError } from '@/lib/bookings'
import { CALL_LIMITS, CALL_OUTCOMES, FINAL_STATUSES, LIVE_STATUSES, MAX_CALL_MIN, advanceCall, createMissedCallTask, leadIdsByPhoneDigits, reconcileCall } from '@/lib/calls'
import { leadName } from '@/lib/format'
import { assertCanSeeLead, canSeeLead, leadScope } from '@/lib/lead-access'
import { findExistingLead } from '@/lib/leads'
import { dialProblem, formatPhone, toE164 } from '@/lib/phone-numbers'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'
import { dialerDemo, twilioClient, twilioConfig } from '@/lib/twilio'
import { listenRelay, startListen, stopListen, type ListenSession } from '@/lib/listen'

export type { ListenRoles, ListenSession } from '@/lib/listen'
import { analyzeCall } from '@/lib/call-analysis'
import { callLength, mayReviewByHand } from '@/lib/call-review-rules'
import { statusAfterCall } from '@/lib/call-status'
import { leadForOutgoingCall } from '@/lib/call-lead'
import { assertCanUseProspect, convertProspect, prospectStatusFor } from '@/lib/call-lists'
import { asDetails, askFor } from '@/lib/prospect-details'
import { toActionError, type ActionResult } from './result'

const callers = ['ADMIN', 'SALES'] as const

const StartInput = z.object({ to: z.string().trim().min(3).max(40), leadId: z.string().cuid().nullish(), prospectId: z.string().cuid().nullish(), private: z.boolean().optional() })

/** The contact on a call, as the wrap-up shows it (so the rep can put a name to a number). */
export interface CallContact {
  id: string
  name: string
  firstName: string | null
  lastName: string | null
  company: string | null
}

export interface StartedCall {
  callId: string
  to: string
  display: string
  lead: CallContact | null
  /** a business on a call list (not a lead yet) */
  prospect: { id: string; name: string; listId: string; askFor: string | null } | null
  record: boolean
  /** live Control of the call hints are on (setting + OpenAI key) */
  hints: boolean
  demo: boolean
  /** a personal call: not recorded, no wrap-up, not on the CRM */
  private: boolean
}

/**
 * Step 1 of every outgoing call: checks the caller's line and the number, attaches the lead (given, or found by its
 * phone number), and creates the call row the Twilio webhook will dial for.
 */
export async function startCall(input: z.input<typeof StartInput>): Promise<ActionResult<StartedCall>> {
  try {
    const user = await requireUser([...callers])
    const data = StartInput.parse(input)
    const demo = dialerDemo()
    const line = await prisma.phoneLine.findUnique({ where: { userId: user.id } })
    if (!demo && !line?.active) throw new BookingError('You don’t have a phone line yet. Ask an admin to assign you a number.', 'FORBIDDEN')
    const to = toE164(data.to)
    const problem = dialProblem(to, await getSetting('voice.countries'))
    if (problem || !to) throw new BookingError(problem ?? 'That doesn’t look like a phone number.', 'INVALID_STATE')

    // One call at a time. Anything that still looks live is checked with Twilio first (a lost callback must
    // never lock someone out), then the volume limits.
    const open = await prisma.call.findMany({ where: { userId: user.id, status: { in: [...LIVE_STATUSES] } }, select: { id: true } })
    for (const c of open) if (await reconcileCall(c.id)) throw new BookingError('You’re already on a call. Hang up first.', 'SLOT_TAKEN')
    const [lastMinute, today] = await Promise.all([
      prisma.call.count({ where: { userId: user.id, simulated: false, startedAt: { gt: new Date(Date.now() - 60_000) } } }),
      prisma.call.count({ where: { userId: user.id, simulated: false, startedAt: { gt: new Date(Date.now() - 24 * 3600_000) } } }),
    ])
    if (lastMinute >= CALL_LIMITS.perMinute) throw new BookingError('That’s a lot of calls in a minute. Wait a moment and try again.', 'SLOT_TAKEN')
    if (today >= CALL_LIMITS.perDay) throw new BookingError(`You’ve reached the limit of ${CALL_LIMITS.perDay} calls in 24 hours. Ask an admin if you need more.`, 'SLOT_TAKEN')

    // A personal call (admins only): no contact, no recording, no AI, no listen-in, and nobody else sees it
    if (data.private) {
      if (user.role !== 'ADMIN') throw new BookingError('Only admins can make private calls.', 'FORBIDDEN')
      const call = await prisma.call.create({
        data: { userId: user.id, leadId: null, prospectId: null, direction: 'OUTBOUND', status: 'INITIATED', fromNumber: line?.number ?? '+15005550006', toNumber: to, simulated: demo, private: true },
        select: { id: true },
      })
      return { ok: true, data: { callId: call.id, to, display: formatPhone(to), lead: null, prospect: null, record: false, hints: false, demo, private: true } }
    }

    let leadId: string
    let prospect: StartedCall['prospect'] = null
    if (data.leadId && !data.prospectId) {
      await assertCanSeeLead(data.leadId, user)
      leadId = data.leadId
    } else {
      if (data.prospectId) {
        const p = await assertCanUseProspect(data.prospectId, user)
        prospect = { id: p.id, name: p.name, listId: p.listId, askFor: askFor(asDetails(p.details)) }
      }
      // Every call belongs to a lead: found by phone number, or created now and assigned to the caller
      leadId = (await leadForOutgoingCall(to, user, data.prospectId)).id
    }
    const lead = await callContact(leadId)
    const record = await getSetting('voice.record')
    // No AI during the call: live hints recorded and uploaded both sides every few seconds, competing with the call's
    // own audio for bandwidth and CPU. The AI review runs after the call, on the recording, and can't slow it down.
    const hints = false
    const call = await prisma.call.create({
      data: { userId: user.id, leadId: lead?.id ?? null, prospectId: data.prospectId ?? null, direction: 'OUTBOUND', status: 'INITIATED', fromNumber: line?.number ?? '+15005550006', toNumber: to, simulated: demo },
      select: { id: true },
    })
    return { ok: true, data: { callId: call.id, to, display: formatPhone(to), lead, prospect, record, hints, demo, private: false } }
  } catch (err) {
    return toActionError(err)
  }
}

async function callContact(leadId: string): Promise<CallContact> {
  const l = await prisma.lead.findUniqueOrThrow({ where: { id: leadId }, select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true } })
  return { id: l.id, name: leadName(l), firstName: l.firstName, lastName: l.lastName, company: l.company }
}

/**
 * Who is this number? For the keypad while typing: a lead (yours, or whose it is), a business on a call list, or the
 * business Google lists at that number (`lookup`, only once the CRM has no name for it).
 */
export async function identifyCaller(number: string, opts: { lookup?: boolean } = {}): Promise<ActionResult<CallerId | null>> {
  try {
    const user = await requireUser([...callers])
    const n = z.string().trim().min(3).max(40).parse(number)
    return { ok: true, data: await identifyNumber(n, user, { lookup: Boolean(opts.lookup) }) }
  } catch (err) {
    return toActionError(err)
  }
}

/** The user's calls that still look live, checked with Twilio and closed if they're really over. */
export async function clearStuckCalls(): Promise<ActionResult<{ stillLive: number }>> {
  try {
    const user = await requireUser([...callers])
    const open = await prisma.call.findMany({ where: { userId: user.id, status: { in: [...LIVE_STATUSES] } }, select: { id: true } })
    let stillLive = 0
    for (const c of open) if (await reconcileCall(c.id)) stillLive++
    return { ok: true, data: { stillLive } }
  } catch (err) {
    return toActionError(err)
  }
}

/** The browser gave up before Twilio picked the call up (microphone refused, connection error, hung up while connecting). */
export async function abandonCall(callId: string, reason: 'canceled' | 'failed'): Promise<ActionResult> {
  try {
    const user = await requireUser([...callers])
    const id = z.string().cuid().parse(callId)
    const call = await prisma.call.findUnique({ where: { id }, select: { userId: true, status: true, twilioCallSid: true, simulated: true } })
    if (!call || call.userId !== user.id) throw new BookingError('Call not found.', 'NOT_FOUND')
    // Once Twilio has the call, its own callbacks decide how it ended
    if (call.status === 'INITIATED' && (!call.twilioCallSid || call.simulated)) await advanceCall(id, { status: reason === 'failed' ? 'FAILED' : 'CANCELED' })
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

const SimInput = z.object({ callId: z.string().cuid(), status: z.enum(['RINGING', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'NO_ANSWER', 'BUSY']) })

/** Demo mode only (development without Twilio): stands in for Twilio's callbacks so the whole flow can be tried. */
export async function simulateCallProgress(input: z.input<typeof SimInput>): Promise<ActionResult> {
  try {
    if (!dialerDemo()) throw new BookingError('Not available.', 'FORBIDDEN')
    const user = await requireUser([...callers])
    const data = SimInput.parse(input)
    const call = await prisma.call.findUnique({ where: { id: data.callId }, select: { userId: true, simulated: true } })
    if (!call?.simulated || call.userId !== user.id) throw new BookingError('Call not found.', 'NOT_FOUND')
    await advanceCall(data.callId, { status: data.status })
    const row = await prisma.call.findUnique({ where: { id: data.callId }, select: { direction: true } })
    if (row?.direction === 'INBOUND' && data.status === 'NO_ANSWER') await createMissedCallTask(data.callId)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/**
 * An unknown caller the rep named in the wrap-up becomes a contact of theirs (or is linked to the existing one with that
 * number, when they may see it). Returns the lead id, or null when the number is someone else's lead.
 */
async function contactForIncoming(call: { id: string; fromNumber: string }, user: SessionUser): Promise<string | null> {
  const e164 = toE164(call.fromNumber)
  if (!e164) return null
  const leadId = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'call-lead:' + e164}))`
    const existing = await findExistingLead(tx, undefined, e164)
    if (existing) return canSeeLead(user, existing) ? existing.id : null
    const label = await tx.phoneLabel.findUnique({ where: { number: e164 } })
    const lead = await tx.lead.create({ data: { phone: e164, company: label?.company ?? null, website: label?.website ?? null, source: 'Phone call', sourceDetail: 'Called us', status: 'NEW', assignedToId: user.id } })
    await logActivity({ entityType: 'LEAD', entityId: lead.id, actorId: user.id, action: 'lead.created', metadata: { source: 'Phone call', auto: 'call' } }, tx)
    return lead.id
  })
  if (leadId) await prisma.call.updateMany({ where: { id: call.id, leadId: null }, data: { leadId } })
  return leadId
}

/** Put a name to the number: the person (and business) the rep spoke with, saved on the contact and noted on its timeline. */
async function nameContact(leadId: string, contact: { firstName?: string; lastName?: string; company?: string }, user: SessionUser, callId: string): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { firstName: true, lastName: true, company: true, assignedToId: true } })
  if (!lead || !canSeeLead(user, lead)) return
  const next = { firstName: contact.firstName || null, lastName: contact.lastName || null, company: contact.company || null }
  // a blank field never wipes what's there
  const fields = (Object.keys(next) as (keyof typeof next)[]).filter((k) => next[k] && next[k] !== lead[k])
  if (!fields.length) return
  await prisma.lead.update({ where: { id: leadId }, data: Object.fromEntries(fields.map((k) => [k, next[k]])) })
  await logActivity({ entityType: 'LEAD', entityId: leadId, action: 'lead.edited', actorId: user.id, metadata: { fields, via: 'call', callId } })
}

const WrapInput = z.object({
  callId: z.string().cuid(),
  outcome: z.enum(Object.keys(CALL_OUTCOMES) as [keyof typeof CALL_OUTCOMES, ...(keyof typeof CALL_OUTCOMES)[]]),
  notes: z.string().trim().max(2000).optional(),
  /** Who they spoke with: saved on the contact (blank = leave as is) */
  contact: z
    .object({ firstName: z.string().trim().max(100).optional(), lastName: z.string().trim().max(100).optional(), company: z.string().trim().max(200).optional() })
    .optional(),
})

/**
 * After the call: what happened and a note. Saved on the call and on the lead's timeline. A first real conversation
 * with a New lead moves it to Contacted (forward only, logged like every stage change).
 */
export async function saveCallWrapUp(input: z.input<typeof WrapInput>): Promise<ActionResult<{ leadId: string | null; madeLead: boolean }>> {
  try {
    const user = await requireUser([...callers])
    const data = WrapInput.parse(input)
    const call = await prisma.call.findUnique({ where: { id: data.callId } })
    if (!call || call.userId !== user.id) throw new BookingError('Call not found.', 'NOT_FOUND')
    // A wrap-up can come before Twilio's last callback. Twilio decides whether the call is over; a wrap-up can
    // never end a call that is still connected (that would also lift the one-call-at-a-time rule).
    if (!FINAL_STATUSES.includes(call.status)) await reconcileCall(call.id)
    const firstWrapUp = !call.outcome
    await prisma.call.update({ where: { id: call.id }, data: { outcome: data.outcome, notes: data.notes || null } })
    let leadId = call.leadId
    let madeLead = false
    if (call.prospectId && firstWrapUp) {
      const p = await prisma.prospect.findUnique({ where: { id: call.prospectId }, select: { id: true, status: true, listId: true } })
      if (p) {
        await prisma.prospect.update({
          where: { id: p.id },
          data: {
            attempts: { increment: 1 },
            lastCalledAt: new Date(),
            lastOutcome: data.outcome,
            ...(data.notes ? { notes: data.notes } : {}),
            ...(p.status !== 'CONVERTED' && data.outcome !== 'interested' ? { status: prospectStatusFor(data.outcome, p.status) } : {}),
          },
        })
        if (data.outcome === 'interested') {
          const r = await convertProspect(p.id, user)
          leadId = r.leadId
          madeLead = r.created
        }
        revalidatePath(`/sales/call-lists/${p.listId}`)
        revalidatePath('/sales/call-lists')
      }
    }
    if (!leadId && data.contact && call.direction === 'INBOUND' && (data.contact.firstName || data.contact.lastName || data.contact.company)) {
      leadId = await contactForIncoming(call, user)
      if (leadId) madeLead = true
    }
    if (leadId && data.contact) await nameContact(leadId, data.contact, user, call.id)
    if (leadId && firstWrapUp) {
      await logActivity({ entityType: 'LEAD', entityId: leadId, actorId: user.id, action: 'call.outcome', metadata: { callId: call.id, outcome: data.outcome, notes: data.notes || null } })
      // The lead gets the status the agent marked (never pulled back out of the deal stages)
      const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { status: true } })
      const next = lead ? statusAfterCall(lead.status, data.outcome) : null
      if (lead && next) {
        await prisma.lead.update({ where: { id: leadId }, data: { status: next } })
        await logActivity({ entityType: 'LEAD', entityId: leadId, actorId: user.id, action: 'lead.status_changed', metadata: { from: lead.status, to: next, auto: 'call-outcome', callId: call.id } })
      }
      revalidatePath(`/sales/leads/${leadId}`)
    }
    return { ok: true, data: { leadId, madeLead } }
  } catch (err) {
    return toActionError(err)
  }
}

export interface DialerContact {
  id: string
  name: string
  company: string | null
  phone: string
  display: string
}

/** Contacts with a phone number this user may see, matching a name, company or number. */
export async function searchDialerContacts(query: string): Promise<ActionResult<DialerContact[]>> {
  try {
    const user = await requireUser([...callers])
    const q = z.string().trim().max(60).parse(query)
    const digits = q.replace(/\D/g, '')
    // numbers are stored however people typed them: match on digits only
    const byPhone = digits.length >= 3 ? await leadIdsByPhoneDigits(digits.slice(-9)) : []
    const rows = await prisma.lead.findMany({
      where: {
        AND: [
          leadScope(user),
          { phone: { not: null } },
          { NOT: { phone: '' } },
          q
            ? {
                OR: [
                  { firstName: { contains: q, mode: 'insensitive' } },
                  { lastName: { contains: q, mode: 'insensitive' } },
                  { company: { contains: q, mode: 'insensitive' } },
                  { email: { contains: q, mode: 'insensitive' } },
                  ...(byPhone.length ? [{ id: { in: byPhone } }] : []),
                ],
              }
            : {},
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 12,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true },
    })
    return {
      ok: true,
      data: rows.flatMap((l) => {
        const e164 = l.phone ? toE164(l.phone) : null
        return e164 ? [{ id: l.id, name: leadName(l), company: l.company, phone: e164, display: formatPhone(e164) }] : []
      }),
    }
  } catch (err) {
    return toActionError(err)
  }
}

export interface RecentCall {
  id: string
  direction: 'INBOUND' | 'OUTBOUND'
  /** the other side's number (who we called, or who called us) */
  other: string
  otherDisplay: string
  to: string
  display: string
  lead: { id: string; name: string } | null
  status: string
  outcome: string | null
  durationSec: number | null
  startedAt: string
  live: boolean
  /** a personal call (only its caller sees it) */
  private: boolean
}

/** This user's latest calls, for the dialer's Recent tab. */
export async function recentCalls(): Promise<ActionResult<RecentCall[]>> {
  try {
    const user = await requireUser([...callers])
    const rows = await prisma.call.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: 'desc' },
      take: 20,
      include: { lead: { select: { id: true, firstName: true, lastName: true, email: true } } },
    })
    return {
      ok: true,
      data: rows.map((c) => ({
        id: c.id,
        direction: c.direction,
        other: c.direction === 'INBOUND' ? c.fromNumber : c.toNumber,
        otherDisplay: formatPhone(c.direction === 'INBOUND' ? c.fromNumber : c.toNumber),
        to: c.toNumber,
        display: formatPhone(c.toNumber),
        lead: c.lead ? { id: c.lead.id, name: leadName(c.lead) } : null,
        status: c.status,
        outcome: c.outcome,
        durationSec: c.durationSec,
        startedAt: c.startedAt.toISOString(),
        live: LIVE_STATUSES.includes(c.status),
        private: c.private,
      })),
    }
  } catch (err) {
    return toActionError(err)
  }
}

/** Run (or re-run) the analysis of a recorded call now. The caller and admins only. */
export async function reanalyzeCall(callId: string): Promise<ActionResult<{ status: string }>> {
  try {
    const user = await requireUser([...callers])
    const id = z.string().cuid().parse(callId)
    const call = await prisma.call.findUnique({ where: { id }, select: { userId: true, analysisStatus: true, recordingSec: true, durationSec: true } })
    if (!call || (user.role !== 'ADMIN' && call.userId !== user.id)) throw new BookingError('Call not found.', 'NOT_FOUND')
    // Calls under two minutes are reviewed by an admin only, so the review cost stays under control
    if (!mayReviewByHand(user.role, callLength(call))) throw new BookingError('This call was under 2 minutes, so it is not reviewed automatically. An admin can review it.', 'FORBIDDEN')
    if (call.analysisStatus === 'processing') return { ok: true, data: { status: 'processing' } }
    const status = await analyzeCall(id, { force: true, ignoreMinimum: user.role === 'ADMIN' })
    if (status === 'none') throw new BookingError('This call has no recording to analyse (or OpenAI isn’t set up).', 'INVALID_STATE')
    revalidatePath(`/sales/calls/${id}`)
    return { ok: true, data: { status } }
  } catch (err) {
    return toActionError(err)
  }
}

export interface IncomingCaller {
  callId: string
  number: string
  display: string
  /** The contact the call is filed under (one you can see) */
  lead: CallContact | null
  /** Who the number belongs to, as far as the CRM (or Google) knows */
  id: CallerId | null
}

/** Who is calling (the contact the incoming webhook matched). Only for the person whose line is ringing. */
export async function lookupIncoming(callId: string): Promise<ActionResult<IncomingCaller>> {
  try {
    const user = await requireUser([...callers])
    const id = z.string().cuid().parse(callId)
    const call = await prisma.call.findUnique({ where: { id }, select: { userId: true, direction: true, fromNumber: true, leadId: true } })
    if (!call || call.userId !== user.id || call.direction !== 'INBOUND') throw new BookingError('Call not found.', 'NOT_FOUND')
    const [lead, who] = await Promise.all([call.leadId ? callContact(call.leadId) : null, identifyNumber(call.fromNumber, user, { lookup: true }).catch(() => null)])
    return { ok: true, data: { callId: id, number: call.fromNumber, display: formatPhone(call.fromNumber), lead, id: who } }
  } catch (err) {
    return toActionError(err)
  }
}

/** Demo mode only (development without Twilio): a contact "calls" you, so the ringing flow can be tried. */
export async function simulateIncomingCall(): Promise<ActionResult<{ callId: string; from: string }>> {
  try {
    if (!dialerDemo()) throw new BookingError('Not available.', 'FORBIDDEN')
    const user = await requireUser([...callers])
    const lead = await prisma.lead.findFirst({ where: { AND: [leadScope(user), { phone: { not: null } }, { NOT: { phone: '' } }] }, orderBy: { updatedAt: 'desc' }, select: { id: true, phone: true } })
    const from = (lead?.phone && toE164(lead.phone)) || '+972501234567'
    const call = await prisma.call.create({ data: { userId: user.id, leadId: lead?.id ?? null, direction: 'INBOUND', status: 'RINGING', fromNumber: from, toNumber: '+15005550006', simulated: true } })
    return { ok: true, data: { callId: call.id, from } }
  } catch (err) {
    return toActionError(err)
  }
}

export interface LiveCall {
  callId: string
  rep: { id: string; name: string }
  /** the client: their name, else the number */
  contact: string
  company: string | null
  number: string
  status: 'INITIATED' | 'RINGING' | 'IN_PROGRESS'
  startedAt: string
  answeredAt: string | null
  /** this admin can listen to it now (setting on, relay set up, connected, not private, not their own) */
  canListen: boolean
}

/** Calls happening right now across the team, for admins (Calls page → Live now). */
export async function liveCalls(): Promise<ActionResult<{ calls: LiveCall[]; listenIn: boolean; listenReady: boolean }>> {
  try {
    const user = await requireUser(['ADMIN'])
    const [listenIn, listenReady] = [await getSetting('voice.listenIn'), Boolean(listenRelay())]
    const rows = await prisma.call.findMany({
      where: { status: { in: [...LIVE_STATUSES] }, simulated: false, private: false, startedAt: { gt: new Date(Date.now() - 95 * 60_000) }, twilioCallSid: { not: null } },
      orderBy: { startedAt: 'desc' },
      take: 50,
      include: { user: { select: { id: true, name: true, email: true } }, lead: { select: { firstName: true, lastName: true, email: true, company: true } }, prospect: { select: { name: true } } },
    })
    const calls: LiveCall[] = rows.map((c) => ({
      callId: c.id,
      rep: { id: c.userId ?? '', name: c.user?.name ?? c.user?.email ?? 'Teammate' },
      contact: c.lead ? leadName(c.lead) : (c.prospect?.name ?? formatPhone(c.direction === 'OUTBOUND' ? c.toNumber : c.fromNumber)),
      company: c.lead?.company ?? null,
      number: formatPhone(c.direction === 'OUTBOUND' ? c.toNumber : c.fromNumber),
      status: c.status as LiveCall['status'],
      startedAt: c.startedAt.toISOString(),
      answeredAt: c.answeredAt?.toISOString() ?? null,
      canListen: listenIn && listenReady && c.status === 'IN_PROGRESS' && Boolean(c.twilioCallSid) && !c.private && c.userId !== user.id,
    }))
    return { ok: true, data: { calls, listenIn, listenReady } }
  } catch (err) {
    return toActionError(err)
  }
}

const CallId = z.string().regex(/^[a-z0-9]{20,40}$/i)

/** An admin starts listening to a live call: forks its audio to the relay and returns what the player needs. */
export async function listenStart(callId: string): Promise<ActionResult<ListenSession>> {
  try {
    const user = await requireUser(['ADMIN'])
    return { ok: true, data: await startListen(user, CallId.parse(callId)) }
  } catch (err) {
    return toActionError(err)
  }
}

/** The admin stopped listening (noted in the audit log with how long). */
export async function listenStop(callId: string, seconds: number): Promise<ActionResult> {
  try {
    const user = await requireUser(['ADMIN'])
    await stopListen(user, CallId.parse(callId), z.number().min(0).max(24 * 3600).catch(0).parse(seconds))
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** A note an admin sent the rep during a call, as the call screen and the call's page show it. */
export interface CallNoteItem {
  id: string
  body: string
  author: string
  createdAt: string
}

const noteItem = (n: { id: string; body: string; createdAt: Date; author: { name: string | null; email: string | null } | null }): CallNoteItem => ({ id: n.id, body: n.body, author: n.author?.name ?? n.author?.email ?? 'Admin', createdAt: n.createdAt.toISOString() })

/**
 * An admin sends the rep a short note during a live call (from Live now). It pops up on the rep's call screen within
 * a couple of seconds. The client never sees it.
 */
export async function sendCallNote(callId: string, body: string): Promise<ActionResult<CallNoteItem>> {
  try {
    const user = await requireUser(['ADMIN'])
    const text = z.string().trim().min(1, 'Write something first.').max(200, 'Keep it under 200 characters: the rep reads it mid-call.').parse(body)
    const call = await prisma.call.findUnique({ where: { id: CallId.parse(callId) }, select: { id: true, userId: true, status: true, private: true, simulated: true } })
    if (!call || call.private) throw new BookingError('That call can’t take notes.', 'NOT_FOUND')
    if (!LIVE_STATUSES.includes(call.status)) throw new BookingError('That call has ended.', 'INVALID_STATE')
    const note = await prisma.callNote.create({ data: { callId: call.id, authorId: user.id, body: text }, include: { author: { select: { name: true, email: true } } } })
    await logActivity({ actorId: user.id, entityType: 'USER', entityId: call.userId ?? user.id, action: 'call.note.sent', metadata: { callId: call.id, noteId: note.id, rep: call.userId } })
    return { ok: true, data: noteItem(note) }
  } catch (err) {
    return toActionError(err)
  }
}

/**
 * Notes on a call newer than `since` (ms since the epoch), for the rep's call screen (polled every couple of seconds
 * while the call is live) and the listener panel. The call's rep and admins only. `live` tells the poll when to stop.
 */
export async function callNotes(callId: string, since: number): Promise<ActionResult<{ notes: CallNoteItem[]; live: boolean }>> {
  try {
    const user = await requireUser([...callers])
    const call = await prisma.call.findUnique({ where: { id: CallId.parse(callId) }, select: { id: true, userId: true, status: true, private: true } })
    if (!call || call.private || (user.role !== 'ADMIN' && call.userId !== user.id)) return { ok: false, error: 'Call not found.' }
    const after = new Date(Number.isFinite(since) && since > 0 ? since : 0)
    const rows = await prisma.callNote.findMany({ where: { callId: call.id, createdAt: { gt: after } }, orderBy: { createdAt: 'asc' }, take: 50, include: { author: { select: { name: true, email: true } } } })
    return { ok: true, data: { notes: rows.map(noteItem), live: LIVE_STATUSES.includes(call.status) } }
  } catch (err) {
    return toActionError(err)
  }
}

/**
 * Delete a call for good (admins only): its row with the transcript and review, who it was shared with, and the Twilio
 * recording. Leads, call lists and the activity on a lead's timeline stay. A call that is still going can't be deleted.
 */
export async function deleteCall(callId: string): Promise<ActionResult<{ recordingDeleted: boolean }>> {
  try {
    const admin = await requireUser(['ADMIN'])
    const id = z.string().cuid().parse(callId)
    const call = await prisma.call.findUnique({ where: { id }, select: { id: true, status: true, userId: true, leadId: true, toNumber: true, startedAt: true, durationSec: true, recordingSid: true, private: true } })
    if (!call) throw new BookingError('Call not found.', 'NOT_FOUND')
    const goingNow = LIVE_STATUSES.includes(call.status) && Date.now() - call.startedAt.getTime() < MAX_CALL_MIN * 60_000
    if (goingNow) throw new BookingError('This call is still going. Delete it after it ends.', 'INVALID_STATE')
    // The audio lives at Twilio: remove it too, so a deleted call leaves no recording behind.
    let recordingDeleted = false
    const cfg = twilioConfig()
    if (call.recordingSid && cfg) {
      try {
        await twilioClient(cfg).recordings(call.recordingSid).remove()
        recordingDeleted = true
      } catch (err) {
        // already gone at Twilio counts as deleted; anything else is only logged, the call is still removed
        const status = (err as { status?: number }).status
        if (status === 404) recordingDeleted = true
        else console.error('[calls] could not delete the Twilio recording', call.id, err)
      }
    }
    await prisma.call.delete({ where: { id: call.id } })
    await logActivity({
      entityType: 'USER',
      entityId: admin.id,
      actorId: admin.id,
      action: 'call.deleted',
      metadata: { callId: call.id, repId: call.userId, leadId: call.leadId, to: call.toNumber, startedAt: call.startedAt.toISOString(), durationSec: call.durationSec, private: call.private, hadRecording: Boolean(call.recordingSid), recordingDeleted },
    })
    revalidatePath('/sales/calls')
    revalidatePath('/sales', 'layout')
    return { ok: true, data: { recordingDeleted } }
  } catch (err) {
    return toActionError(err)
  }
}
