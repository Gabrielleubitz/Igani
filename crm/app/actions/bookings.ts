'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import {
  BookingError,
  allowedTeammates,
  assertSlotOffered,
  cancelBooking as cancelBookingCore,
  confirmBooking,
  createPendingBooking,
  deleteBooking as deleteBookingCore,
  emailDataFor,
  findTimeConflict,
  teamMeetingIds,
  notifyAdminsOfPendingBooking,
  notifyGuestOfPendingBooking,
} from '@/lib/bookings'
import { getAvailableSlots } from '@/lib/calendar'
import { sendApprovalRequestEmail, sendBookingInviteEmail } from '@/lib/email'
import { appUrl } from '@/lib/env'
import { logActivity } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { createInviteToken, verifyInviteToken } from '@/lib/tokens'
import { publicActionError, toActionError, type ActionResult } from './result'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

const salesInviteSchema = z.object({
  leadId: z.string().cuid().optional(),
  guestName: z.string().trim().min(1).max(120),
  guestEmail: z.string().trim().toLowerCase().email().max(254),
  startTime: z.string().datetime(),
  durationMinutes: z.coerce.number().int().min(15).max(240),
  title: z.string().trim().min(1).max(200).default('Igani intro call'),
  notes: z.string().trim().max(2000).optional(),
  /** ADMINs may book on behalf of another host; reps always book for themselves. */
  hostId: z.string().cuid().optional(),
  /** Teammates to add to the call (admins: anyone; others: admins only). */
  teammateIds: z.array(z.string().cuid()).max(20).optional(),
})

export type SalesInviteInput = z.input<typeof salesInviteSchema>

/** Slots for the sales booking form. */
export async function getHostSlots(input: { date: string; durationMinutes: number; hostId?: string }): Promise<ActionResult<string[]>> {
  try {
    const user = await requireUser(['ADMIN', 'SALES'])
    const { date, durationMinutes } = z.object({ date: isoDate, durationMinutes: z.number().int().min(15).max(240) }).parse(input)
    const hostId = user.role === 'ADMIN' && input.hostId ? z.string().cuid().parse(input.hostId) : user.id
    if (hostId !== user.id) await assertActiveHost(hostId)
    return { ok: true, data: await getAvailableSlots(hostId, new Date(`${date}T00:00:00Z`), durationMinutes) }
  } catch (err) {
    return toActionError(err)
  }
}

/** Live note under the time field: is the chosen time free? (`note` is null when it is.) */
export async function checkInviteTime(input: { startTime: string; durationMinutes: number; hostId?: string }): Promise<ActionResult<{ note: string | null }>> {
  try {
    const user = await requireUser(['ADMIN', 'SALES'])
    const data = z.object({ startTime: z.string().datetime(), durationMinutes: z.coerce.number().int().min(15).max(240), hostId: z.string().cuid().optional() }).parse(input)
    const hostId = user.role === 'ADMIN' && data.hostId ? data.hostId : user.id
    await assertActiveHost(hostId)
    return { ok: true, data: { note: await findTimeConflict(hostId, new Date(data.startTime), data.durationMinutes) } }
  } catch (err) {
    return toActionError(err)
  }
}

const teamMeetingSchema = z.object({
  title: z.string().trim().min(1).max(200).default('Team call'),
  notes: z.string().trim().max(2000).optional(),
  startTime: z.string().datetime(),
  durationMinutes: z.coerce.number().int().min(15).max(240),
  teammateIds: z.array(z.string().cuid()).min(1, 'Select at least one teammate').max(20),
})

/**
 * Internal call with teammates (no client). Admins can add anyone and book straight away: the Meet is created and
 * everyone is emailed the link. Everyone else can only REQUEST a call with admins: the time is held, the admins are
 * emailed, and the Meet is created when an admin approves it on the Meetings page.
 */
export async function createTeamMeeting(input: z.input<typeof teamMeetingSchema>): Promise<ActionResult<{ bookingId: string; meetUrl: string | null; requested: boolean }>> {
  try {
    const user = await requireUser(['ADMIN', 'SALES'])
    const data = teamMeetingSchema.parse(input)
    await assertActiveHost(user.id)
    const allowed = await allowedTeammates(user, user.id)
    const picked = [...new Set(data.teammateIds)].map((id) => allowed.find((t) => t.id === id))
    if (picked.some((p) => !p)) throw new BookingError(user.role === 'ADMIN' ? 'One of those teammates cannot be added.' : 'You can only add admins to a call.', 'FORBIDDEN')
    const people = picked.filter((p): p is NonNullable<typeof p> => Boolean(p))
    const first = people[0]
    if (!first) throw new BookingError('Select at least one teammate.', 'INVALID_STATE')
    const start = new Date(data.startTime)
    const conflict = await findTimeConflict(user.id, start, data.durationMinutes)
    if (conflict) throw new BookingError(conflict, 'SLOT_TAKEN')

    const booking = await createPendingBooking({
      hostId: user.id,
      source: 'SALES_INVITE',
      start,
      durationMinutes: data.durationMinutes,
      title: data.title,
      guestName: first.name ?? first.email,
      guestEmail: first.email,
      notes: data.notes ?? null,
      createdById: user.id,
      noLead: true,
    })
    await logActivity({ entityType: 'BOOKING', entityId: booking.id, action: 'booking.team_meeting', actorId: user.id })
    await logActivity({ entityType: 'BOOKING', entityId: booking.id, action: 'booking.teammates', actorId: user.id, metadata: { userIds: people.map((p) => p.id) } })
    if (user.role !== 'ADMIN') {
      try {
        const base = await emailDataFor(booking.id)
        const emailId = await sendApprovalRequestEmail(people.map((p) => p.email), { ...base, hostName: user.name ?? user.email, hostEmail: user.email, guestName: user.name ?? user.email, guestEmail: user.email }, { teamRequest: true })
        await logActivity({ entityType: 'BOOKING', entityId: booking.id, action: 'booking.team_request_sent', actorId: user.id, metadata: { emailId, to: people.map((p) => p.id) } })
      } catch (err) {
        await cancelBookingCore(booking.id, user.id, 'request-email-failed').catch(() => undefined) // release the held time so they can retry
        throw new BookingError(`Could not email the admins: ${err instanceof Error ? err.message : 'unknown error'}`, 'INVALID_STATE')
      }
      revalidatePath('/sales', 'layout')
      return { ok: true, data: { bookingId: booking.id, meetUrl: null, requested: true } }
    }
    try {
      const confirmed = await confirmBooking(booking.id, user.id)
      revalidatePath('/sales', 'layout')
      return { ok: true, data: { bookingId: booking.id, meetUrl: confirmed.meetUrl, requested: false } }
    } catch (err) {
      await cancelBookingCore(booking.id, user.id, 'team-meeting-failed').catch(() => undefined) // release the held time
      throw err
    }
  } catch (err) {
    return toActionError(err)
  }
}

/** Rep picks a slot → PENDING booking + Resend invite with a signed /invites/[token] link. */
export async function createSalesInvite(input: SalesInviteInput): Promise<ActionResult<{ bookingId: string }>> {
  try {
    const user = await requireUser(['ADMIN', 'SALES'])
    const data = salesInviteSchema.parse(input)
    const hostId = user.role === 'ADMIN' && data.hostId ? data.hostId : user.id
    await assertActiveHost(hostId)
    const start = new Date(data.startTime)

    // The guest may already be someone's contact even when "New person" was picked: check by email too.
    const lead = data.leadId
      ? await prisma.lead.findUnique({ where: { id: data.leadId }, select: { id: true, assignedToId: true } })
      : await prisma.lead.findUnique({ where: { email: data.guestEmail }, select: { id: true, assignedToId: true } })
    if (data.leadId && !lead) throw new BookingError('Contact not found.', 'NOT_FOUND')
    // Salespeople can only invite their own leads; an admin has to assign the lead first.
    if (lead && user.role === 'SALES' && lead.assignedToId !== user.id) {
      throw new BookingError('This contact is not assigned to you. Ask an admin to assign it, then send the invite.', 'FORBIDDEN')
    }
    const teammateIds = [...new Set(data.teammateIds ?? [])]
    if (teammateIds.length > 0) {
      const allowed = new Set((await allowedTeammates(user, hostId)).map((t) => t.id))
      if (teammateIds.some((id) => !allowed.has(id))) throw new BookingError(user.role === 'ADMIN' ? 'One of those teammates cannot be added.' : 'You can only add admins to a call.', 'FORBIDDEN')
    }
    // Any time is fine as long as it is in the future and the host has nothing else then.
    const conflict = await findTimeConflict(hostId, start, data.durationMinutes)
    if (conflict) throw new BookingError(conflict, 'SLOT_TAKEN')

    const booking = await createPendingBooking({
      hostId,
      source: 'SALES_INVITE',
      start,
      durationMinutes: data.durationMinutes,
      title: data.title,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      notes: data.notes ?? null,
      leadId: lead?.id ?? null,
      createdById: user.id,
    })

    // The pending booking holds the slot, so the invite stays valid until the meeting starts.
    if (teammateIds.length > 0) await logActivity({ entityType: 'BOOKING', entityId: booking.id, action: 'booking.teammates', actorId: user.id, metadata: { userIds: teammateIds } })
    const token = createInviteToken(booking.id, booking.startTime)
    await prisma.booking.update({ where: { id: booking.id }, data: { inviteToken: token } })

    const host = await prisma.user.findUniqueOrThrow({ where: { id: hostId }, select: { name: true, email: true, timeZone: true } })
    try {
      const emailId = await sendBookingInviteEmail({
        bookingId: booking.id,
        title: booking.title,
        startTime: booking.startTime,
        endTime: booking.endTime,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        hostName: host.name ?? 'the Igani team',
        hostEmail: host.email ?? user.email,
        timeZone: host.timeZone,
        notes: booking.notes,
        acceptUrl: appUrl(`/invites/${encodeURIComponent(token)}`),
      })
      await logActivity({ entityType: 'BOOKING', entityId: booking.id, action: 'booking.invite_sent', actorId: user.id, metadata: { emailId } })
    } catch (err) {
      // Release the held slot so the rep can retry cleanly.
      await cancelBookingCore(booking.id, user.id, 'invite-email-failed')
      throw err instanceof Error ? new BookingError(`Invite email failed: ${err.message}`, 'INVALID_STATE') : err
    }

    revalidatePath('/sales')
    return { ok: true, data: { bookingId: booking.id } }
  } catch (err) {
    return toActionError(err)
  }
}

/** Public: guest accepts the invite → Google event with Meet, CONFIRMED, confirmation email. */
export async function confirmInvite(token: string): Promise<ActionResult<{ meetUrl: string | null }>> {
  try {
    const verified = verifyInviteToken(token)
    if (!verified.ok) {
      throw new BookingError(verified.reason === 'expired' ? 'This invitation has expired.' : 'This invitation link is invalid.', 'INVALID_STATE')
    }
    const booking = await prisma.booking.findUnique({ where: { inviteToken: token }, select: { id: true, source: true } })
    if (!booking || booking.id !== verified.bookingId || booking.source !== 'SALES_INVITE') {
      throw new BookingError('This invitation link is invalid.', 'NOT_FOUND')
    }
    const confirmed = await confirmBooking(booking.id, null)
    revalidatePath(`/invites/${token}`)
    return { ok: true, data: { meetUrl: confirmed.meetUrl } }
  } catch (err) {
    return publicActionError(err)
  }
}

/** Public: list open slots for a booking page on a date. */
export async function getPublicSlots(slug: string, date: string): Promise<ActionResult<string[]>> {
  try {
    isoDate.parse(date)
    const page = await prisma.bookingPage.findUnique({ where: { slug }, select: { active: true, hostId: true, durationMinutes: true, host: { select: { role: true } } } })
    if (!page?.active || !page.host.role) throw new BookingError('Booking page not found.', 'NOT_FOUND')
    return { ok: true, data: await getAvailableSlots(page.hostId, new Date(`${date}T00:00:00Z`), page.durationMinutes) }
  } catch (err) {
    return publicActionError(err)
  }
}

const publicBookingSchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  startTime: z.string().datetime(),
  notes: z.string().trim().max(2000).optional(),
  /** Honeypot — must stay empty */
  company_website: z.string().max(0).optional(),
})

export type PublicBookingInput = z.input<typeof publicBookingSchema>

/** Public /book/[slug] submission: instant confirmation or PENDING awaiting admin approval. */
export async function createPublicBooking(
  input: PublicBookingInput,
): Promise<ActionResult<{ status: 'CONFIRMED' | 'PENDING'; meetUrl: string | null }>> {
  try {
    const data = publicBookingSchema.parse(input)
    const page = await prisma.bookingPage.findUnique({ where: { slug: data.slug }, include: { host: { select: { role: true } } } })
    if (!page?.active || !page.host.role) throw new BookingError('Booking page not found.', 'NOT_FOUND')
    const start = new Date(data.startTime)
    await assertSlotOffered(page.hostId, start, page.durationMinutes)

    const booking = await createPendingBooking({
      hostId: page.hostId,
      source: 'PUBLIC_PAGE',
      start,
      durationMinutes: page.durationMinutes,
      title: page.title,
      guestName: data.name,
      guestEmail: data.email,
      notes: data.notes ?? null,
      bookingPageId: page.id,
    })

    if (page.requiresApproval) {
      await notifyAdminsOfPendingBooking(booking.id).catch((err: unknown) => console.error('[bookings] approval notice failed', err))
      await notifyGuestOfPendingBooking(booking.id)
      return { ok: true, data: { status: 'PENDING', meetUrl: null } }
    }
    try {
      const confirmed = await confirmBooking(booking.id, null)
      return { ok: true, data: { status: 'CONFIRMED', meetUrl: confirmed.meetUrl } }
    } catch (err) {
      await cancelBookingCore(booking.id, null, 'instant-confirmation-failed')
      throw err
    }
  } catch (err) {
    return publicActionError(err)
  }
}

/** The host must still be on the team as ADMIN or SALES (deactivated / marketing users can't host). */
async function assertActiveHost(hostId: string): Promise<void> {
  const host = await prisma.user.findUnique({ where: { id: hostId }, select: { role: true, email: true } })
  const allowed = host?.email ? await prisma.allowedUser.findUnique({ where: { email: host.email }, select: { active: true, role: true } }) : null
  if (!host || !allowed?.active || (allowed.role !== 'ADMIN' && allowed.role !== 'SALES')) throw new BookingError('That host is no longer an active sales or admin teammate.', 'INVALID_STATE')
}

export async function approveBooking(bookingId: string): Promise<ActionResult> {
  try {
    const user = await requireUser(['ADMIN'])
    await confirmBooking(z.string().cuid().parse(bookingId), user.id)
    revalidatePath('/admin/bookings')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Staff cancel (or, for a pending approval request, decline). The guest is emailed unless `notifyGuest` is false. */
/** Host or admin: mark a meeting as done (or undo it). Done meetings move to "Past & cancelled". */
export async function markBookingDone(bookingId: string, done: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser(['ADMIN', 'SALES'])
    const id = z.string().cuid().parse(bookingId)
    const booking = await prisma.booking.findUnique({ where: { id }, select: { hostId: true, status: true } })
    if (!booking) throw new BookingError('Meeting not found.', 'NOT_FOUND')
    if (user.role !== 'ADMIN' && booking.hostId !== user.id) throw new BookingError('Only the host or an admin can do that.', 'FORBIDDEN')
    if (booking.status === 'CANCELLED') throw new BookingError('This meeting was cancelled.', 'INVALID_STATE')
    await logActivity({ entityType: 'BOOKING', entityId: id, action: done ? 'booking.done' : 'booking.undone', actorId: user.id })
    revalidatePath('/sales', 'layout')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Host or admin: delete a meeting for good (the guest is not emailed; use Cancel to send a notice). */
export async function deleteBooking(bookingId: string): Promise<ActionResult> {
  try {
    const user = await requireUser(['ADMIN', 'SALES'])
    const id = z.string().cuid().parse(bookingId)
    const booking = await prisma.booking.findUnique({ where: { id }, select: { hostId: true } })
    if (!booking) throw new BookingError('Meeting not found.', 'NOT_FOUND')
    if (user.role !== 'ADMIN' && booking.hostId !== user.id) throw new BookingError('Only the host or an admin can delete a meeting.', 'FORBIDDEN')
    await deleteBookingCore(id, user.id)
    revalidatePath('/admin/bookings')
    revalidatePath('/sales', 'layout')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

export async function cancelBooking(bookingId: string, reason = 'cancelled-by-staff', notifyGuest = true): Promise<ActionResult> {
  try {
    const user = await requireUser(['ADMIN', 'SALES'])
    const id = z.string().cuid().parse(bookingId)
    const booking = await prisma.booking.findUnique({ where: { id }, select: { hostId: true, status: true, source: true, startTime: true } })
    if (!booking) throw new BookingError('Booking not found.', 'NOT_FOUND')
    if (user.role !== 'ADMIN' && booking.hostId !== user.id) throw new BookingError('Only the host or an admin can cancel.', 'FORBIDDEN')
    if (booking.startTime.getTime() <= Date.now()) throw new BookingError('This meeting has already started, so it can’t be cancelled.', 'INVALID_STATE')
    // A team meeting has no client to notify.
    if ((await teamMeetingIds([id])).has(id)) notifyGuest = false
    const kind = booking.status === 'PENDING' && booking.source === 'PUBLIC_PAGE' ? 'declined' : 'cancelled'
    await cancelBookingCore(id, user.id, z.string().max(200).parse(reason), notifyGuest ? kind : false)
    revalidatePath('/admin/bookings')
    revalidatePath('/sales', 'layout')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}
