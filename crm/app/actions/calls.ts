'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { requireUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { CALL_LIMITS, CALL_OUTCOMES, FINAL_STATUSES, LIVE_STATUSES, advanceCall, leadForNumber, reconcileCall } from '@/lib/calls'
import { leadName } from '@/lib/format'
import { assertCanSeeLead, leadScope } from '@/lib/lead-access'
import { dialProblem, formatPhone, toE164 } from '@/lib/phone-numbers'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'
import { dialerDemo } from '@/lib/twilio'
import { toActionError, type ActionResult } from './result'

const callers = ['ADMIN', 'SALES'] as const

const StartInput = z.object({ to: z.string().trim().min(3).max(40), leadId: z.string().cuid().nullish() })

export interface StartedCall {
  callId: string
  to: string
  display: string
  lead: { id: string; name: string } | null
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
    if (data.leadId) {
      await assertCanSeeLead(data.leadId, user)
      const l = await prisma.lead.findUniqueOrThrow({ where: { id: data.leadId }, select: { id: true, firstName: true, lastName: true, email: true, phone: true } })
      lead = { id: l.id, name: leadName(l) }
    } else {
      lead = await leadForNumber(to, leadScope(user))
    }
    const record = await getSetting('voice.record')
    const call = await prisma.call.create({
      data: { userId: user.id, leadId: lead?.id ?? null, direction: 'OUTBOUND', status: 'INITIATED', fromNumber: line?.number ?? '+15005550006', toNumber: to, simulated: demo },
      select: { id: true },
    })
    return { ok: true, data: { callId: call.id, to, display: formatPhone(to), lead, record, demo } }
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
export async function saveCallWrapUp(input: z.input<typeof WrapInput>): Promise<ActionResult<{ leadId: string | null }>> {
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
    if (call.leadId && firstWrapUp) {
      await logActivity({ entityType: 'LEAD', entityId: call.leadId, actorId: user.id, action: 'call.outcome', metadata: { callId: call.id, outcome: data.outcome, notes: data.notes || null } })
      if (data.outcome === 'connected') {
        const moved = await prisma.lead.updateMany({ where: { id: call.leadId, status: 'NEW' }, data: { status: 'CONTACTED' } })
        if (moved.count) await logActivity({ entityType: 'LEAD', entityId: call.leadId, actorId: user.id, action: 'lead.status_changed', metadata: { from: 'NEW', to: 'CONTACTED', auto: 'call-connected', callId: call.id } })
      }
      revalidatePath(`/sales/leads/${call.leadId}`)
    }
    return { ok: true, data: { leadId: call.leadId } }
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
                  ...(digits.length >= 3 ? [{ phone: { contains: digits.slice(-7) } }] : []),
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
