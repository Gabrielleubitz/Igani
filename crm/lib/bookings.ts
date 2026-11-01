import 'server-only'
import type { Booking, BookingSource, Prisma } from '@prisma/client'
import { logActivity } from './audit'
import { createMeetEvent, deleteCalendarEvent, getAvailableSlots, isSlotStillFree } from './calendar'
import { getSetting } from './settings'
import { createAutoTask, deleteAutoTasksForBooking } from './tasks'
import { sendApprovalRequestEmail, sendBookingCancelledEmail, sendBookingConfirmedEmail, sendBookingRequestedEmail, sendTeammateMeetingEmail, type BookingEmailData } from './email'
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

/**
 * Manual scheduling: any time is allowed unless it is in the past or clashes with something the host already has.
 * Returns a short note describing the clash, or null when the time is free.
 */
export async function findTimeConflict(hostId: string, start: Date, durationMinutes: number, excludeBookingId?: string): Promise<string | null> {
  if (start.getTime() <= Date.now()) return 'That time has already passed.'
  const end = new Date(start.getTime() + durationMinutes * 60_000)
  const pad = (await getSetting('booking.bufferMinutes')) * 60_000
  const clash = await prisma.booking.findFirst({
    where: {
      hostId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startTime: { lt: new Date(end.getTime() + pad) },
      endTime: { gt: new Date(start.getTime() - pad) },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    select: { title: true, guestName: true, status: true },
  })
  if (clash) return `A call is already booked at this time (${clash.title} with ${clash.guestName}${clash.status === 'PENDING' ? ', awaiting confirmation' : ''}).`
  if (!(await isSlotStillFree(hostId, start, end, excludeBookingId))) return 'This time is busy on the Google Calendar.'
  return null
}

/** Bookings in the window where `userId` was added as a teammate (they are not the host, but are in the meeting). */
async function addedBookingClash(userId: string, from: Date, to: Date, excludeBookingId?: string): Promise<boolean> {
  const logs = await prisma.activityLog.findMany({
    where: { entityType: 'BOOKING', action: 'booking.teammates', metadata: { path: ['userIds'], array_contains: userId } },
    select: { entityId: true },
  })
  if (logs.length === 0) return false
  const hit = await prisma.booking.findFirst({
    where: {
      id: { in: logs.map((l) => l.entityId), ...(excludeBookingId ? { not: excludeBookingId } : {}) },
      status: { in: ['PENDING', 'CONFIRMED'] },
      startTime: { lt: to },
      endTime: { gt: from },
    },
    select: { id: true },
  })
  return Boolean(hit)
}

/**
 * Checks every added teammate's availability for [start, start+duration): their bookings in the CRM and their own
 * Google Calendar (when connected). Returns a message naming each person who is not free, or null when all are.
 */
export async function findParticipantConflicts(userIds: string[], start: Date, durationMinutes: number, excludeBookingId?: string): Promise<string | null> {
  const ids = [...new Set(userIds)]
  if (ids.length === 0) return null
  const end = new Date(start.getTime() + durationMinutes * 60_000)
  const pad = (await getSetting('booking.bufferMinutes')) * 60_000
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } })
  const busy: string[] = []
  await Promise.all(
    users.map(async (u) => {
      const who = u.name ?? u.email ?? 'A teammate'
      const clash = await prisma.booking.findFirst({
        where: {
          hostId: u.id,
          status: { in: ['PENDING', 'CONFIRMED'] },
          startTime: { lt: new Date(end.getTime() + pad) },
          endTime: { gt: new Date(start.getTime() - pad) },
          ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        },
        select: { id: true },
      })
      if (clash || (await addedBookingClash(u.id, new Date(start.getTime() - pad), new Date(end.getTime() + pad), excludeBookingId))) return void busy.push(who)
      try {
        if (!(await isSlotStillFree(u.id, start, end, excludeBookingId))) busy.push(who)
      } catch {
        // Google not connected (or unreachable) for this person: their calendar cannot be read, so do not block.
      }
    }),
  )
  if (busy.length === 0) return null
  busy.sort()
  return busy.length === 1 ? `${busy[0]} is not free at this time.` : `${busy.slice(0, -1).join(', ')} and ${busy[busy.length - 1]} are not free at this time.`
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
  /** Team meetings have no client, so no lead is created for the "guest". */
  noLead?: boolean
}

/**
 * Creates a PENDING booking that holds the slot. A per-host advisory lock serialises
 * concurrent requests so two guests can never hold overlapping times.
 */
export async function createPendingBooking(input: NewBookingInput): Promise<Booking> {
  const end = new Date(input.start.getTime() + input.durationMinutes * 60_000)
  // Same buffer the slot list uses, so two adjacent bookings made at the same moment still keep it.
  const pad = (await getSetting('booking.bufferMinutes')) * 60_000
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.hostId}))`
    const clash = await tx.booking.findFirst({
      where: { hostId: input.hostId, status: { in: ['PENDING', 'CONFIRMED'] }, startTime: { lt: new Date(end.getTime() + pad) }, endTime: { gt: new Date(input.start.getTime() - pad) } },
      select: { id: true },
    })
    if (clash) throw new BookingError('That time was just taken.', 'SLOT_TAKEN')

    const leadId = input.noLead
      ? null
      : (input.leadId ??
      (await upsertLeadForGuest(
        tx,
        { email: input.guestEmail, name: input.guestName },
        input.source === 'PUBLIC_PAGE' ? 'booking-page' : 'sales-invite',
        input.hostId,
        input.createdById ?? null,
      )))
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

/** Teammates who may be added to a call: admins can add anyone on the team, everyone else only admins. */
export async function allowedTeammates(actor: { id: string; role: 'ADMIN' | 'SALES' | 'MARKETING' | null }, hostId: string): Promise<{ id: string; name: string | null; email: string }[]> {
  const users = await prisma.user.findMany({
    where: { role: actor.role === 'ADMIN' ? { in: ['ADMIN', 'SALES', 'MARKETING'] } : 'ADMIN', email: { not: null }, id: { notIn: [actor.id, hostId] } },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })
  return users.flatMap((u) => (u.email ? [{ id: u.id, name: u.name, email: u.email }] : []))
}

/** Which of these bookings are internal team meetings (no client). */
export async function teamMeetingIds(bookingIds: string[]): Promise<Set<string>> {
  if (bookingIds.length === 0) return new Set()
  const rows = await prisma.activityLog.findMany({ where: { entityType: 'BOOKING', entityId: { in: bookingIds }, action: 'booking.team_meeting' }, select: { entityId: true } })
  return new Set(rows.map((r) => r.entityId))
}

/** Bookings currently marked as done (latest of done / undone wins). Looks back 120 days. */
export async function doneBookingIds(): Promise<Set<string>> {
  const rows = await prisma.activityLog.findMany({
    where: { entityType: 'BOOKING', action: { in: ['booking.done', 'booking.undone'] }, createdAt: { gte: new Date(Date.now() - 120 * 86_400_000) } },
    orderBy: { createdAt: 'asc' },
    select: { entityId: true, action: true },
  })
  const done = new Set<string>()
  for (const r of rows) {
    if (r.action === 'booking.done') done.add(r.entityId)
    else done.delete(r.entityId)
  }
  return done
}

/** Removes a meeting for good: frees the time, deletes the calendar event and prep task, then the record itself. */
export async function deleteBooking(bookingId: string, actorId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { id: true, title: true, guestName: true, startTime: true, status: true } })
  if (!booking) throw new BookingError('Meeting not found.', 'NOT_FOUND')
  await cancelBooking(bookingId, actorId, 'deleted', false) // no-op when already cancelled
  await prisma.booking.delete({ where: { id: bookingId } })
  await logActivity({ entityType: 'BOOKING', entityId: bookingId, action: 'booking.deleted', actorId, metadata: { title: booking.title, guest: booking.guestName, start: booking.startTime.toISOString(), wasStatus: booking.status } })
}

/** Teammates invited to each booking (id → names), for showing who is on a call. */
export async function teammateNamesByBooking(bookingIds: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  if (bookingIds.length === 0) return out
  const logs = await prisma.activityLog.findMany({ where: { entityType: 'BOOKING', entityId: { in: bookingIds }, action: 'booking.teammates' }, orderBy: { createdAt: 'asc' }, select: { entityId: true, metadata: true } })
  const idsFor = new Map(logs.map((l) => [l.entityId, ((l.metadata as { userIds?: unknown } | null)?.userIds as unknown[] | undefined)?.filter((i): i is string => typeof i === 'string') ?? []]))
  const people = await prisma.user.findMany({ where: { id: { in: [...new Set([...idsFor.values()].flat())] } }, select: { id: true, name: true, email: true } })
  const name = new Map(people.map((p) => [p.id, p.name ?? p.email ?? 'Teammate']))
  for (const [bookingId, ids] of idsFor) out.set(bookingId, ids.map((i) => name.get(i)).filter((n): n is string => Boolean(n)))
  return out
}

/** Bookings a person may see: admins all; everyone else the ones they host or were added to. */
export async function bookingScope(user: { id: string; role: string }): Promise<Prisma.BookingWhereInput> {
  if (user.role === 'ADMIN') return {}
  const added = await prisma.activityLog.findMany({ where: { entityType: 'BOOKING', action: 'booking.teammates', metadata: { path: ['userIds'], array_contains: user.id } }, select: { entityId: true } })
  return { OR: [{ hostId: user.id }, { id: { in: added.map((a) => a.entityId) } }] }
}

/** Teammate ids saved with the invite (kept in the audit log), narrowed to people who still have access. */
async function teammatesForBooking(bookingId: string, hostId: string): Promise<{ id: string; name: string | null; email: string }[]> {
  const row = await prisma.activityLog.findFirst({ where: { entityType: 'BOOKING', entityId: bookingId, action: 'booking.teammates' }, orderBy: { createdAt: 'desc' }, select: { metadata: true } })
  const ids = (row?.metadata as { userIds?: unknown } | null)?.userIds
  if (!Array.isArray(ids) || ids.length === 0) return []
  const users = await prisma.user.findMany({ where: { id: { in: ids.filter((i): i is string => typeof i === 'string'), not: hostId }, role: { not: null }, email: { not: null } }, select: { id: true, name: true, email: true } })
  return users.flatMap((u) => (u.email ? [{ id: u.id, name: u.name, email: u.email }] : []))
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

  const teammates = await teammatesForBooking(bookingId, booking.hostId)
  const isTeam = (await teamMeetingIds([bookingId])).has(bookingId)
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
      teammates,
    })
  } catch (err) {
    // Only roll back if nobody cancelled it meanwhile.
    await prisma.booking.updateMany({ where: { id: bookingId, status: 'CONFIRMED' }, data: { status: 'PENDING', confirmedAt: null } })
    await logActivity({
      entityType: 'BOOKING',
      entityId: bookingId,
      action: 'booking.calendar_failed',
      actorId,
      metadata: { error: err instanceof Error ? err.message : String(err) },
    })
    throw new BookingError('Could not create the calendar event. Please try again.', 'CALENDAR')
  }

  // If the booking was cancelled while the calendar event was being created, remove the event and stop here.
  const stillConfirmed = await prisma.booking.updateMany({ where: { id: bookingId, status: 'CONFIRMED' }, data: { meetUrl: event.meetUrl, googleEventId: event.eventId } })
  if (stillConfirmed.count === 0) {
    await deleteCalendarEvent(booking.hostId, event.eventId).catch((err: unknown) => console.error('[bookings] cleanup of event for cancelled booking failed', bookingId, err))
    throw new BookingError('This booking was cancelled.', 'INVALID_STATE')
  }
  const confirmed = await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } })
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
    // Team meetings have no client to confirm to: only the teammates are emailed.
    if (!isTeam) {
      const emailId = await sendBookingConfirmedEmail({ ...(await emailDataFor(bookingId)), meetUrl: event.meetUrl })
      await logActivity({ entityType: 'BOOKING', entityId: bookingId, action: 'booking.confirmation_sent', actorId, metadata: { emailId } })
    }
    if (teammates.length > 0) {
      const data = { ...(await emailDataFor(bookingId)), ...(isTeam ? { guestName: 'the team' } : {}) }
      for (const t of teammates) {
        try {
          await sendTeammateMeetingEmail({ ...data, meetUrl: event.meetUrl, teammateEmail: t.email, teammateName: t.name ?? t.email })
        } catch (err) {
          console.error('[bookings] teammate email failed', bookingId, t.id, err)
        }
      }
      await logActivity({ entityType: 'BOOKING', entityId: bookingId, action: 'booking.teammates_notified', actorId, metadata: { userIds: teammates.map((t) => t.id) } })
    }
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
export async function cancelBooking(bookingId: string, actorId: string | null, reason: string, notifyGuest: false | 'cancelled' | 'declined' = false, opts: { /** The event is already gone from Google (it was cancelled there). */ googleAlreadyGone?: boolean } = {}): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { bookingPage: { select: { slug: true, active: true } } } })
  if (!booking) throw new BookingError('Booking not found.', 'NOT_FOUND')
  if (booking.status === 'CANCELLED') return
  const won = await prisma.$transaction(async (tx) => {
    // Atomic: two clicks (or a click + the cron) can't both cancel and both email the guest.
    const res = await tx.booking.updateMany({ where: { id: bookingId, status: { not: 'CANCELLED' } }, data: { status: 'CANCELLED', cancelledAt: new Date() } })
    if (res.count === 0) return false
    await logActivity({ entityType: 'BOOKING', entityId: bookingId, action: 'booking.cancelled', actorId, metadata: { reason } }, tx)
    if (booking.leadId) {
      await logActivity({ entityType: 'LEAD', entityId: booking.leadId, action: 'meeting.cancelled', actorId, metadata: { bookingId, title: booking.title, start: booking.startTime.toISOString(), reason } }, tx)
      // The "Prep for call" task makes no sense any more.
      await deleteAutoTasksForBooking(bookingId, booking.leadId, actorId, tx)
    }
    return true
  })
  if (!won) return
  // Re-read: a confirmation finishing at the same moment may have just stored the Google event id.
  const fresh = await prisma.booking.findUnique({ where: { id: bookingId }, select: { googleEventId: true } })
  if (fresh?.googleEventId) booking.googleEventId = fresh.googleEventId
  if (booking.googleEventId && !opts.googleAlreadyGone) {
    // Upcoming meetings are cancelled for everyone invited (guest and teammates); a meeting that is over just disappears quietly.
    await deleteCalendarEvent(booking.hostId, booking.googleEventId, booking.endTime.getTime() > Date.now()).catch(async (err: unknown) => {
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
      const emailId = await sendBookingCancelledEmail({ ...(await emailDataFor(bookingId)), kind: notifyGuest, rebookUrl, removeFromCalendar: booking.status === 'CONFIRMED' })
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

/**
 * A host who is deactivated or removed can no longer run their meetings: cancel everything upcoming they host (guests of client
 * meetings get the usual cancellation notice, and the Google event is removed for everyone invited). Returns how many.
 * One failure never stops the rest; it is recorded in the audit log instead.
 */
export async function cancelUpcomingMeetingsOfHost(hostId: string, actorId: string): Promise<number> {
  const upcoming = await prisma.booking.findMany({ where: { hostId, status: { in: ['PENDING', 'CONFIRMED'] }, startTime: { gt: new Date() } }, select: { id: true, status: true, source: true } })
  if (upcoming.length === 0) return 0
  const team = await teamMeetingIds(upcoming.map((b) => b.id))
  let n = 0
  for (const b of upcoming) {
    try {
      const notice = team.has(b.id) ? false : b.status === 'PENDING' && b.source === 'PUBLIC_PAGE' ? 'declined' : 'cancelled'
      await cancelBooking(b.id, actorId, 'host-deactivated', notice)
      n++
    } catch (err) {
      console.error('[bookings] could not cancel a meeting of a deactivated host', b.id, err)
      await logActivity({ entityType: 'BOOKING', entityId: b.id, action: 'booking.cancel_on_deactivate_failed', actorId, metadata: { error: err instanceof Error ? err.message : String(err) } })
    }
  }
  return n
}
