import 'server-only'
import type { Booking, BookingSource, Prisma } from '@prisma/client'
import { logActivity } from './audit'
import { createMeetEvent, deleteCalendarEvent, getAvailableSlots, isSlotStillFree } from './calendar'
import { getSetting } from './settings'
import { createAutoTask } from './tasks'
import { sendApprovalRequestEmail, sendBookingCancelledEmail, sendBookingConfirmedEmail, sendBookingRequestedEmail, type BookingEmailData } from './email'
import { appUrl, env } from './env'
import { prisma } from './prisma'

export class BookingError extends Error {
  constructor(
    message: string,
    readonly code: 'SLOT_TAKEN' | 'NOT_FOUND' | 'INVALID_STATE' | 'INVALID_SLOT' | 'CALENDAR' | 'FORBIDDEN',
  ) {
    super(message)
    this.name = 'BookingError'
  }
}

/** Civil date (as a midnight-UTC Date) of `instant` in `timeZone`, for getAvailableSlots. */
export function civilDateInZone(instant: Date, timeZone: string): Date {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(instant)
    .split('-')
    .map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d))
}

/** Throws unless `start` is one of the host's currently offered slots for that duration. */
export async function assertSlotOffered(hostId: string, start: Date, durationMinutes: number): Promise<void> {
  const host = await prisma.user.findUniqueOrThrow({ where: { id: hostId }, select: { timeZone: true } })
  const slots = await getAvailableSlots(hostId, civilDateInZone(start, host.timeZone), durationMinutes)
  if (!slots.includes(start.toISOString())) throw new BookingError('That time is no longer available.', 'INVALID_SLOT')
}

/** Finds or creates the lead for a guest email (bookings always attach to the pipeline). */
async function upsertLeadForGuest(
  tx: Prisma.TransactionClient,
  guest: { email: string; name: string },
  source: string,
  assignToId: string,
  actorId: string | null,
): Promise<string> {
  const existing = await tx.lead.findUnique({ where: { email: guest.email }, select: { id: true, assignedToId: true } })
  if (existing) {
    if (!existing.assignedToId) await tx.lead.update({ where: { id: existing.id }, data: { assignedToId: assignToId } })
    return existing.id
  }
  const [firstName, ...rest] = guest.name.trim().split(/\s+/)
  const lead = await tx.lead.create({
    data: { email: guest.email, firstName: firstName ?? null, lastName: rest.join(' ') || null, source, assignedToId: assignToId },
  })
  await logActivity({ entityType: 'LEAD', entityId: lead.id, action: 'lead.created', actorId, metadata: { source } }, tx)
  return lead.id
}

export interface NewBookingInput {
  hostId: string
  source: BookingSource
  start: Date
  durationMinutes: number
  title: string
  guestName: string
  guestEmail: string
  notes?: string | null
  leadId?: string | null
  bookingPageId?: string | null
  createdById?: string | null
}

/**
 * Creates a PENDING booking that holds the slot. A per-host advisory lock serialises
 * concurrent requests so two guests can never hold overlapping times.
 */
export async function createPendingBooking(input: NewBookingInput): Promise<Booking> {
  const end = new Date(input.start.getTime() + input.durationMinutes * 60_000)
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.hostId}))`
    const clash = await tx.booking.findFirst({
      where: { hostId: input.hostId, status: { in: ['PENDING', 'CONFIRMED'] }, startTime: { lt: end }, endTime: { gt: input.start } },
      select: { id: true },
    })
    if (clash) throw new BookingError('That time was just taken.', 'SLOT_TAKEN')

    const leadId =
      input.leadId ??
      (await upsertLeadForGuest(
        tx,
        { email: input.guestEmail, name: input.guestName },
        input.source === 'PUBLIC_PAGE' ? 'booking-page' : 'sales-invite',
        input.hostId,
        input.createdById ?? null,
      ))
    const booking = await tx.booking.create({
      data: {
        status: 'PENDING',
        source: input.source,
        startTime: input.start,
        endTime: end,
        title: input.title,
        notes: input.notes ?? null,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        hostId: input.hostId,
        leadId,
        bookingPageId: input.bookingPageId ?? null,
        createdById: input.createdById ?? null,
      },
    })
    await logActivity(
      {
        entityType: 'BOOKING',
        entityId: booking.id,
        action: 'booking.created',
        actorId: input.createdById ?? null,
        metadata: { source: input.source, start: booking.startTime.toISOString(), leadId },
      },
      tx,
    )
    return booking
  })
}

export async function emailDataFor(bookingId: string): Promise<BookingEmailData> {
  const b = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { host: { select: { name: true, email: true, timeZone: true } } },
  })
  return {
    bookingId: b.id,
    title: b.title,
    startTime: b.startTime,
    endTime: b.endTime,
    guestName: b.guestName,
    guestEmail: b.guestEmail,
    hostName: b.host.name ?? 'the Igani team',
    hostEmail: b.host.email ?? env().EMAIL_FROM,
    timeZone: b.host.timeZone,
    notes: b.notes,
  }
}

/**
 * PENDING → CONFIRMED: re-checks the calendar, creates the Google Calendar event with a Meet
 * link (conferenceDataVersion 1), stores meetUrl, moves the lead to DEMO_SCHEDULED and emails
 * the branded confirmation with an .ics attachment.
 */
export async function confirmBooking(bookingId: string, actorId: string | null): Promise<Booking> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking) throw new BookingError('Booking not found.', 'NOT_FOUND')
  if (booking.status === 'CONFIRMED') return booking
  if (booking.status !== 'PENDING') throw new BookingError('This booking was cancelled.', 'INVALID_STATE')
  if (booking.startTime.getTime() <= Date.now()) throw new BookingError('This time has already passed.', 'INVALID_STATE')
  if (!(await isSlotStillFree(booking.hostId, booking.startTime, booking.endTime, booking.id))) {
    throw new BookingError('The host is no longer free at this time.', 'SLOT_TAKEN')
  }

  // Claim the transition so a double click / second tab cannot create two events.
  const claimed = await prisma.booking.updateMany({
    where: { id: bookingId, status: 'PENDING' },
    data: { status: 'CONFIRMED', confirmedAt: new Date() },
  })
  if (claimed.count === 0) {
    const current = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } })
    if (current.status === 'CONFIRMED') return current
    throw new BookingError('This booking was cancelled.', 'INVALID_STATE')
  }

  let event: Awaited<ReturnType<typeof createMeetEvent>>
  try {
    event = await createMeetEvent({
      hostId: booking.hostId,
      bookingId: booking.id,
      title: booking.title,
      description: [booking.notes, `Booked via Igani (${booking.source === 'PUBLIC_PAGE' ? 'public page' : 'sales invite'}).`]
        .filter(Boolean)
        .join('\n\n'),
      start: booking.startTime,
      end: booking.endTime,
      guestEmail: booking.guestEmail,
      guestName: booking.guestName,
    })
  } catch (err) {
    await prisma.booking.update({ where: { id: bookingId }, data: { status: 'PENDING', confirmedAt: null } })
    await logActivity({
      entityType: 'BOOKING',
      entityId: bookingId,
      action: 'booking.calendar_failed',
      actorId,
      metadata: { error: err instanceof Error ? err.message : String(err) },
    })
    throw new BookingError('Could not create the calendar event. Please try again.', 'CALENDAR')
  }

  const confirmed = await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: { meetUrl: event.meetUrl, googleEventId: event.eventId },
    })
    if (updated.leadId) {
      const lead = await tx.lead.findUnique({ where: { id: updated.leadId }, select: { status: true } })
      if (lead && (lead.status === 'NEW' || lead.status === 'CONTACTED')) {
        await tx.lead.update({ where: { id: updated.leadId }, data: { status: 'DEMO_SCHEDULED' } })
        await logActivity(
          { entityType: 'LEAD', entityId: updated.leadId, action: 'lead.status_changed', actorId, metadata: { from: lead.status, to: 'DEMO_SCHEDULED', bookingId } },
          tx,
        )
      }
    }
    if (updated.leadId) {
      // Auto prep task for the rep, due an hour before the call (or now if it is sooner).
      await createAutoTask(
        { leadId: updated.leadId, title: `Prep for call: ${updated.title}`, dueAt: new Date(Math.max(Date.now(), updated.startTime.getTime() - 3600_000)), assigneeId: updated.hostId, auto: 'prep', bookingId },
        tx,
      )
    }
    await logActivity(
      { entityType: 'BOOKING', entityId: bookingId, action: 'booking.confirmed', actorId, metadata: { meetUrl: event.meetUrl, googleEventId: event.eventId } },
      tx,
    )
    return updated
  })

  try {
    const emailId = await sendBookingConfirmedEmail({ ...(await emailDataFor(bookingId)), meetUrl: event.meetUrl })
    await logActivity({ entityType: 'BOOKING', entityId: bookingId, action: 'booking.confirmation_sent', actorId, metadata: { emailId } })
  } catch (err) {
    // The meeting exists; a mail outage must not undo it. Surface it in the audit log instead.
    console.error('[bookings] confirmation email failed', bookingId, err)
    await logActivity({
      entityType: 'BOOKING',
      entityId: bookingId,
      action: 'booking.confirmation_failed',
      actorId,
      metadata: { error: err instanceof Error ? err.message : String(err) },
    })
  }
  return confirmed
}

/**
 * Cancels a booking, removes the Google event and (when `notifyGuest` is set) emails the guest a branded notice
 * — 'declined' for an approval request that was turned down, 'cancelled' for a meeting that was called off.
 */
export async function cancelBooking(bookingId: string, actorId: string | null, reason: string, notifyGuest: false | 'cancelled' | 'declined' = false): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { bookingPage: { select: { slug: true, active: true } } } })
  if (!booking) throw new BookingError('Booking not found.', 'NOT_FOUND')
  if (booking.status === 'CANCELLED') return
  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED', cancelledAt: new Date() } })
    await logActivity({ entityType: 'BOOKING', entityId: bookingId, action: 'booking.cancelled', actorId, metadata: { reason } }, tx)
    if (booking.leadId) {
      await logActivity({ entityType: 'LEAD', entityId: booking.leadId, action: 'meeting.cancelled', actorId, metadata: { bookingId, title: booking.title, start: booking.startTime.toISOString(), reason } }, tx)
    }
  })
  if (booking.googleEventId) {
    await deleteCalendarEvent(booking.hostId, booking.googleEventId).catch(async (err: unknown) => {
      await logActivity({
        entityType: 'BOOKING',
        entityId: bookingId,
        action: 'booking.calendar_delete_failed',
        actorId,
        metadata: { error: err instanceof Error ? err.message : String(err) },
      })
    })
  }
  if (notifyGuest && booking.startTime.getTime() > Date.now()) {
    try {
      const rebookUrl = booking.bookingPage?.active ? appUrl(`/book/${booking.bookingPage.slug}`) : null
      const emailId = await sendBookingCancelledEmail({ ...(await emailDataFor(bookingId)), kind: notifyGuest, rebookUrl })
      await logActivity({ entityType: 'BOOKING', entityId: bookingId, action: 'booking.cancellation_sent', actorId, metadata: { emailId, kind: notifyGuest } })
    } catch (err) {
      console.error('[bookings] cancellation email failed', bookingId, err)
      await logActivity({ entityType: 'BOOKING', entityId: bookingId, action: 'booking.cancellation_failed', actorId, metadata: { error: err instanceof Error ? err.message : String(err) } })
    }
  }
}

/** Guest receipt for a request that waits for approval (best effort). */
export async function notifyGuestOfPendingBooking(bookingId: string): Promise<void> {
  try {
    await sendBookingRequestedEmail(await emailDataFor(bookingId))
  } catch (err) {
    console.error('[bookings] request receipt failed', bookingId, err)
  }
}

/** Emails every active ADMIN (plus ADMIN_NOTIFY_EMAIL) that a public booking awaits approval. */
export async function notifyAdminsOfPendingBooking(bookingId: string): Promise<void> {
  const admins = await prisma.allowedUser.findMany({ where: { role: 'ADMIN', active: true }, select: { email: true } })
  const extra = (env().ADMIN_NOTIFY_EMAIL ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const configured = await getSetting('notifications.emails')
  const to = Array.from(new Set([...admins.map((a) => a.email), ...extra, ...configured]))
  await sendApprovalRequestEmail(to, await emailDataFor(bookingId))
}
