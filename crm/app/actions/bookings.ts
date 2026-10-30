'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import {
  BookingError,
  assertSlotOffered,
  cancelBooking as cancelBookingCore,
  confirmBooking,
  createPendingBooking,
  notifyAdminsOfPendingBooking,
} from '@/lib/bookings'
import { getAvailableSlots } from '@/lib/calendar'
import { sendBookingInviteEmail } from '@/lib/email'
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
})

export type SalesInviteInput = z.input<typeof salesInviteSchema>

/** Slots for the sales booking form. */
export async function getHostSlots(input: { date: string; durationMinutes: number; hostId?: string }): Promise<ActionResult<string[]>> {
  try {
    const user = await requireUser(['ADMIN', 'SALES'])
    const { date, durationMinutes } = z.object({ date: isoDate, durationMinutes: z.number().int().min(15).max(240) }).parse(input)
    const hostId = user.role === 'ADMIN' && input.hostId ? input.hostId : user.id
    return { ok: true, data: await getAvailableSlots(hostId, new Date(`${date}T00:00:00Z`), durationMinutes) }
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
    const start = new Date(data.startTime)

    if (data.leadId) {
      const lead = await prisma.lead.findUnique({ where: { id: data.leadId }, select: { assignedToId: true } })
      if (!lead) throw new BookingError('Lead not found.', 'NOT_FOUND')
      if (user.role === 'SALES' && lead.assignedToId && lead.assignedToId !== user.id) {
        throw new BookingError('This lead is assigned to another rep.', 'FORBIDDEN')
      }
    }
    await assertSlotOffered(hostId, start, data.durationMinutes)

    const booking = await createPendingBooking({
      hostId,
      source: 'SALES_INVITE',
      start,
      durationMinutes: data.durationMinutes,
      title: data.title,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      notes: data.notes ?? null,
      leadId: data.leadId ?? null,
      createdById: user.id,
    })

    // The pending booking holds the slot, so the invite stays valid until the meeting starts.
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
    const page = await prisma.bookingPage.findUnique({ where: { slug }, select: { active: true, hostId: true, durationMinutes: true } })
    if (!page?.active) throw new BookingError('Booking page not found.', 'NOT_FOUND')
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
    const page = await prisma.bookingPage.findUnique({ where: { slug: data.slug } })
    if (!page?.active) throw new BookingError('Booking page not found.', 'NOT_FOUND')
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

export async function cancelBooking(bookingId: string, reason = 'cancelled-by-staff'): Promise<ActionResult> {
  try {
    const user = await requireUser(['ADMIN', 'SALES'])
    const id = z.string().cuid().parse(bookingId)
    const booking = await prisma.booking.findUnique({ where: { id }, select: { hostId: true } })
    if (!booking) throw new BookingError('Booking not found.', 'NOT_FOUND')
    if (user.role !== 'ADMIN' && booking.hostId !== user.id) throw new BookingError('Only the host or an admin can cancel.', 'FORBIDDEN')
    await cancelBookingCore(id, user.id, z.string().max(200).parse(reason))
    revalidatePath('/admin/bookings')
    revalidatePath('/sales')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}
