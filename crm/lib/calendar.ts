import 'server-only'
import { randomUUID } from 'node:crypto'
import { GoogleNotConnectedError, calendarForHost } from './google'
import { prisma } from './prisma'
import { civilDate, computeSlots, overlaps, windowsForDate, type Interval } from './slots'

/** Minimum lead time before a slot can be booked. */
export const MIN_NOTICE_MINUTES = 60

async function hostOrThrow(hostId: string): Promise<{ id: string; timeZone: string; email: string | null; name: string | null }> {
  const host = await prisma.user.findUnique({
    where: { id: hostId },
    select: { id: true, timeZone: true, email: true, name: true },
  })
  if (!host) throw new Error(`Host ${hostId} not found`)
  return host
}

/** Busy intervals from the host's primary Google Calendar. */
export async function getGoogleBusy(hostId: string, range: Interval, timeZone: string): Promise<Interval[]> {
  const cal = await calendarForHost(hostId)
  const res = await cal.freebusy.query({
    requestBody: { timeMin: range.start.toISOString(), timeMax: range.end.toISOString(), timeZone, items: [{ id: 'primary' }] },
  })
  const primary = res.data.calendars?.primary
  if (primary?.errors?.length) {
    throw new Error(`Google free/busy error: ${primary.errors.map((e) => e.reason ?? 'unknown').join(', ')}`)
  }
  return (primary?.busy ?? [])
    .filter((b): b is { start: string; end: string } => Boolean(b.start && b.end))
    .map((b) => ({ start: new Date(b.start), end: new Date(b.end) }))
}

/** Bookings already holding time in our DB (pending holds + confirmed not yet synced). */
async function getDbBusy(hostId: string, range: Interval, excludeBookingId?: string): Promise<Interval[]> {
  const rows = await prisma.booking.findMany({
    where: {
      hostId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startTime: { lt: range.end },
      endTime: { gt: range.start },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    select: { startTime: true, endTime: true },
  })
  return rows.map((r) => ({ start: r.startTime, end: r.endTime }))
}

/**
 * Available start times (ISO) for `hostId` on the civil date of `date` (read as UTC Y-M-D,
 * e.g. `new Date('2026-11-02')`), interpreted in the host's time zone.
 * Combines weekly Availability, live Google free/busy and existing PENDING/CONFIRMED bookings.
 */
export async function getAvailableSlots(
  hostId: string,
  date: Date,
  durationMinutes: number,
  options: { now?: Date; excludeBookingId?: string } = {},
): Promise<string[]> {
  const host = await hostOrThrow(hostId)
  const { dayOfWeek } = civilDate(date)
  const rules = await prisma.availability.findMany({
    where: { hostId, dayOfWeek },
    select: { startTime: true, endTime: true },
    orderBy: { startTime: 'asc' },
  })
  const windows = windowsForDate(date, rules, host.timeZone)
  const first = windows[0]
  const last = windows[windows.length - 1]
  if (!first || !last) return []

  const range: Interval = { start: first.start, end: last.end }
  const [googleBusy, dbBusy] = await Promise.all([
    getGoogleBusy(hostId, range, host.timeZone),
    getDbBusy(hostId, range, options.excludeBookingId),
  ])
  return computeSlots({
    windows,
    busy: [...googleBusy, ...dbBusy],
    durationMinutes,
    now: options.now ?? new Date(),
    minNoticeMinutes: MIN_NOTICE_MINUTES,
  })
}

/** True if [start, end) is still bookable for the host (used right before confirming). */
export async function isSlotStillFree(hostId: string, start: Date, end: Date, excludeBookingId?: string): Promise<boolean> {
  const host = await hostOrThrow(hostId)
  const slot = { start, end }
  const [googleBusy, dbBusy] = await Promise.all([
    getGoogleBusy(hostId, slot, host.timeZone),
    getDbBusy(hostId, slot, excludeBookingId),
  ])
  return ![...googleBusy, ...dbBusy].some((b) => overlaps(slot, b))
}

export interface MeetEventInput {
  hostId: string
  bookingId: string
  title: string
  description: string
  start: Date
  end: Date
  guestEmail: string
  guestName: string
}

/** Inserts the event on the host's primary calendar with an auto-provisioned Google Meet. */
export async function createMeetEvent(input: MeetEventInput): Promise<{ eventId: string; meetUrl: string; htmlLink: string | null }> {
  const cal = await calendarForHost(input.hostId)
  const res = await cal.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    sendUpdates: 'none', // Igani sends its own branded confirmation via Resend
    requestBody: {
      summary: input.title,
      description: input.description,
      start: { dateTime: input.start.toISOString() },
      end: { dateTime: input.end.toISOString() },
      attendees: [{ email: input.guestEmail, displayName: input.guestName }],
      extendedProperties: { private: { iganiBookingId: input.bookingId } },
      conferenceData: {
        createRequest: { requestId: `igani-${input.bookingId}-${randomUUID()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } },
      },
      reminders: { useDefault: true },
    },
  })
  const event = res.data
  const meetUrl =
    event.hangoutLink ?? event.conferenceData?.entryPoints?.find((p) => p.entryPointType === 'video')?.uri ?? null
  if (!event.id || !meetUrl) {
    if (event.id) await cal.events.delete({ calendarId: 'primary', eventId: event.id }).catch(() => undefined)
    throw new Error('Google Calendar did not return a Meet link for the new event')
  }
  return { eventId: event.id, meetUrl, htmlLink: event.htmlLink ?? null }
}

export async function deleteCalendarEvent(hostId: string, eventId: string): Promise<void> {
  const cal = await calendarForHost(hostId)
  await cal.events.delete({ calendarId: 'primary', eventId, sendUpdates: 'none' })
}

export { GoogleNotConnectedError }
