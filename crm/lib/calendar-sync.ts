import 'server-only'
import { logActivity } from './audit'
import { cancelBooking } from './bookings'
import { calendarForHost } from './google'
import { prisma } from './prisma'

/** What Google says about one event: gone/cancelled, or its current times. */
export type GoogleEventState = { gone: true } | { gone: false; start: Date | null; end: Date | null }
export type EventLookup = (hostId: string, eventId: string) => Promise<GoogleEventState>

export const googleEventLookup: EventLookup = async (hostId, eventId) => {
  const cal = await calendarForHost(hostId)
  try {
    const { data } = await cal.events.get({ calendarId: 'primary', eventId })
    if (data.status === 'cancelled') return { gone: true }
    return { gone: false, start: data.start?.dateTime ? new Date(data.start.dateTime) : null, end: data.end?.dateTime ? new Date(data.end.dateTime) : null }
  } catch (err) {
    const code = (err as { code?: number; status?: number }).code ?? (err as { status?: number }).status
    if (code === 404 || code === 410) return { gone: true }
    throw err
  }
}

export interface CalendarSyncResult { checked: number; cancelled: number; moved: number; failed: number }

/**
 * Google Calendar → CRM. Upcoming (and just-ended) confirmed meetings that have a Google event are compared with
 * the event itself: deleted/cancelled there → cancelled here; moved there → new times here. Booking counts follow.
 */
export async function syncCalendarChanges(opts: { hostId?: string; leadId?: string; now?: Date; limit?: number; lookup?: EventLookup } = {}): Promise<CalendarSyncResult> {
  const now = opts.now ?? new Date()
  const lookup = opts.lookup ?? googleEventLookup
  const rows = await prisma.booking.findMany({
    where: { status: 'CONFIRMED', googleEventId: { not: null }, endTime: { gte: new Date(now.getTime() - 3600_000) }, ...(opts.hostId ? { hostId: opts.hostId } : {}), ...(opts.leadId ? { leadId: opts.leadId } : {}) },
    select: { id: true, hostId: true, googleEventId: true, startTime: true, endTime: true },
    orderBy: { startTime: 'asc' },
    take: opts.limit ?? 100,
  })
  const r: CalendarSyncResult = { checked: 0, cancelled: 0, moved: 0, failed: 0 }
  const dead = new Set<string>() // hosts whose Google isn't connected / errors: skip their other rows
  for (const b of rows) {
    if (dead.has(b.hostId)) continue
    try {
      const ev = await lookup(b.hostId, b.googleEventId!)
      r.checked++
      if (ev.gone) {
        await cancelBooking(b.id, null, 'cancelled-in-google-calendar', false, { googleAlreadyGone: true })
        r.cancelled++
      } else if (ev.start && ev.end && (Math.abs(ev.start.getTime() - b.startTime.getTime()) >= 60_000 || Math.abs(ev.end.getTime() - b.endTime.getTime()) >= 60_000) && ev.end > ev.start) {
        const res = await prisma.booking.updateMany({ where: { id: b.id, status: 'CONFIRMED' }, data: { startTime: ev.start, endTime: ev.end } })
        if (res.count) {
          await logActivity({ entityType: 'BOOKING', entityId: b.id, action: 'booking.moved_in_google', actorId: null, metadata: { from: b.startTime.toISOString(), to: ev.start.toISOString() } })
          r.moved++
        }
      }
    } catch (err) {
      r.failed++
      dead.add(b.hostId)
      console.error('[calendar-sync] failed for booking', b.id, err)
    }
  }
  return r
}
