'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { requireUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { CALL_LIMITS, CALL_OUTCOMES, FINAL_STATUSES, LIVE_STATUSES, advanceCall, createMissedCallTask, leadForNumber, leadIdsByPhoneDigits, reconcileCall } from '@/lib/calls'
import { leadName } from '@/lib/format'
import { assertCanSeeLead, leadScope } from '@/lib/lead-access'
import { dialProblem, formatPhone, toE164 } from '@/lib/phone-numbers'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'
import { dialerDemo } from '@/lib/twilio'
import { analyzeCall } from '@/lib/call-analysis'
import { assertCanUseProspect, convertProspect, prospectStatusFor } from '@/lib/call-lists'
import { asDetails, askFor } from '@/lib/prospect-details'
import { toActionError, type ActionResult } from './result'

const callers = ['ADMIN', 'SALES'] as const

const StartInput = z.object({ to: z.string().trim().min(3).max(40), leadId: z.string().cuid().nullish(), prospectId: z.string().cuid().nullish() })

export interface StartedCall {
  callId: string
  to: string
  display: string
  lead: { id: string; name: string } | null
  /** a business on a call list (not a lead yet) */
  prospect: { id: string; name: string; listId: string; askFor: string | null } | null
  record: boolean
  demo: boolean
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

    let lead: StartedCall['lead'] = null
    let prospect: StartedCall['prospect'] = null
    if (data.prospectId) {
      const p = await assertCanUseProspect(data.prospectId, user)
      // Already a lead: call it as the lead
      if (p.leadId) {
        const l = await prisma.lead.findUnique({ where: { id: p.leadId }, select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true, assignedToId: true } })
        if (l && (user.role === 'ADMIN' || l.assignedToId === user.id)) lead = { id: l.id, name: leadName(l) }
      } else prospect = { id: p.id, name: p.name, listId: p.listId, askFor: askFor(asDetails(p.details)) }
    } else if (data.leadId) {
      await assertCanSeeLead(data.leadId, user)
      const l = await prisma.lead.findUniqueOrThrow({ where: { id: data.leadId }, select: { id: true, firstName: true, lastName: true, email: true, phone: true } })
      lead = { id: l.id, name: leadName(l) }
    } else {
      lead = await leadForNumber(to, leadScope(user))
    }
    const record = await getSetting('voice.record')
    const call = await prisma.call.create({
      data: { userId: user.id, leadId: lead?.id ?? null, prospectId: prospect?.id ?? null, direction: 'OUTBOUND', status: 'INITIATED', fromNumber: line?.number ?? '+15005550006', toNumber: to, simulated: demo },
      select: { id: true },
    })
    return { ok: true, data: { callId: call.id, to, display: formatPhone(to), lead, prospect, record, demo } }
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

const WrapInput = z.object({
  callId: z.string().cuid(),
  outcome: z.enum(Object.keys(CALL_OUTCOMES) as [keyof typeof CALL_OUTCOMES, ...(keyof typeof CALL_OUTCOMES)[]]),
  notes: z.string().trim().max(2000).optional(),
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
    if (data.outcome === 'interested' && !call.prospectId) throw new BookingError('“Interested” is for calls from a call list.', 'INVALID_STATE')
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
    if (leadId && firstWrapUp) {
      await logActivity({ entityType: 'LEAD', entityId: leadId, actorId: user.id, action: 'call.outcome', metadata: { callId: call.id, outcome: data.outcome, notes: data.notes || null } })
      if (data.outcome === 'connected' || data.outcome === 'interested') {
        const moved = await prisma.lead.updateMany({ where: { id: leadId, status: 'NEW' }, data: { status: 'CONTACTED' } })
        if (moved.count) await logActivity({ entityType: 'LEAD', entityId: leadId, actorId: user.id, action: 'lead.status_changed', metadata: { from: 'NEW', to: 'CONTACTED', auto: 'call-connected', callId: call.id } })
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
  to: string
  display: string
  lead: { id: string; name: string } | null
  status: string
  outcome: string | null
  durationSec: number | null
  startedAt: string
  live: boolean
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
        to: c.toNumber,
        display: formatPhone(c.toNumber),
        lead: c.lead ? { id: c.lead.id, name: leadName(c.lead) } : null,
        status: c.status,
        outcome: c.outcome,
        durationSec: c.durationSec,
        startedAt: c.startedAt.toISOString(),
        live: LIVE_STATUSES.includes(c.status),
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
    const call = await prisma.call.findUnique({ where: { id }, select: { userId: true, analysisStatus: true } })
    if (!call || (user.role !== 'ADMIN' && call.userId !== user.id)) throw new BookingError('Call not found.', 'NOT_FOUND')
    if (call.analysisStatus === 'processing') return { ok: true, data: { status: 'processing' } }
    const status = await analyzeCall(id, { force: true })
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
  lead: { id: string; name: string; company: string | null } | null
}

/** Who is calling (the contact the incoming webhook matched). Only for the person whose line is ringing. */
export async function lookupIncoming(callId: string): Promise<ActionResult<IncomingCaller>> {
  try {
    const user = await requireUser([...callers])
    const id = z.string().cuid().parse(callId)
    const call = await prisma.call.findUnique({ where: { id }, include: { lead: { select: { id: true, firstName: true, lastName: true, email: true, company: true } } } })
    if (!call || call.userId !== user.id || call.direction !== 'INBOUND') throw new BookingError('Call not found.', 'NOT_FOUND')
    return { ok: true, data: { callId: id, number: call.fromNumber, display: formatPhone(call.fromNumber), lead: call.lead ? { id: call.lead.id, name: leadName(call.lead), company: call.lead.company } : null } }
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
