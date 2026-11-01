import 'server-only'
import { randomUUID } from 'node:crypto'
import type { calendar_v3 } from '@googleapis/calendar'
import { GoogleNotConnectedError, calendarForHost } from './google'
import { prisma } from './prisma'
import { civilDate, computeSlots, overlaps, windowsForDate, type Interval } from './slots'
import { getSetting } from './settings'

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
    bufferMinutes: await getSetting('booking.bufferMinutes'),
  })
}

/** True if [start, end) is still bookable for the host (used right before confirming). */
export async function isSlotStillFree(hostId: string, start: Date, end: Date, excludeBookingId?: string): Promise<boolean> {
  const host = await hostOrThrow(hostId)
  const pad = (await getSetting('booking.bufferMinutes')) * 60_000
  const slot = { start: new Date(start.getTime() - pad), end: new Date(end.getTime() + pad) }
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
  /** Team meetings: invite these people instead of one guest, and let Google email them. */
  attendeeEmails?: string[]
}

/** Inserts the event on the host's primary calendar with an auto-provisioned Google Meet. */
export async function createMeetEvent(input: MeetEventInput): Promise<{ eventId: string; meetUrl: string; htmlLink: string | null }> {
  const cal = await calendarForHost(input.hostId)
  const res = await cal.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    sendUpdates: input.attendeeEmails ? 'all' : 'none', // contacts get Igani's branded Resend email; teammates get Google's invite
    requestBody: {
      summary: input.title,
      description: input.description,
      start: { dateTime: input.start.toISOString() },
      end: { dateTime: input.end.toISOString() },
      attendees: input.attendeeEmails ? input.attendeeEmails.map((email) => ({ email })) : [{ email: input.guestEmail, displayName: input.guestName }],
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

/** Calendar events (with a Meet link) in a time window, for importing past team calls. */
export async function listMeetEvents(hostId: string, from: Date, to: Date): Promise<calendar_v3.Schema$Event[]> {
  const cal = await calendarForHost(hostId)
  const out: calendar_v3.Schema$Event[] = []
  let pageToken: string | undefined
  for (let i = 0; i < 5; i++) {
    const r = await cal.events.list({ calendarId: 'primary', timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: true, orderBy: 'startTime', maxResults: 250, pageToken })
    out.push(...(r.data.items ?? []).filter((e) => e.hangoutLink || e.conferenceData?.entryPoints?.some((p) => p.entryPointType === 'video')))
    pageToken = r.data.nextPageToken ?? undefined
    if (!pageToken) break
  }
  return out
}

export async function deleteCalendarEvent(hostId: string, eventId: string): Promise<void> {
  const cal = await calendarForHost(hostId)
  await cal.events.delete({ calendarId: 'primary', eventId, sendUpdates: 'none' })
}

export { GoogleNotConnectedError }
