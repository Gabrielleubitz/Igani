import 'server-only'
import { calendarForHost } from './google'
import { prisma } from './prisma'

/** Pushes one personal calendar entry to the owner's primary Google Calendar. Returns true when it is there. */
export async function pushEntryToGoogle(entryId: string): Promise<boolean> {
  const e = await prisma.calendarEntry.findUnique({ where: { id: entryId }, include: { owner: { select: { timeZone: true } } } })
  if (!e) return false
  if (e.googleEventId) return true
  try {
    const cal = await calendarForHost(e.ownerId)
    const tz = e.owner.timeZone
    const day = (d: Date): string => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
    const res = await cal.events.insert({
      calendarId: 'primary',
      sendUpdates: 'none',
      requestBody: {
        summary: e.title,
        description: e.notes ?? undefined,
        start: e.allDay ? { date: day(e.startTime) } : { dateTime: e.startTime.toISOString() },
        end: e.allDay ? { date: day(e.endTime) } : { dateTime: e.endTime.toISOString() },
        extendedProperties: { private: { iganiEntryId: e.id } },
      },
    })
    if (!res.data.id) return false
    await prisma.calendarEntry.update({ where: { id: e.id }, data: { googleEventId: res.data.id } })
    return true
  } catch (err) {
    console.error('[calendar-entry-sync] push failed', e.id, err instanceof Error ? err.message : err)
    return false
  }
}

/** Removes the entry's Google event (a missing event counts as removed). */
export async function removeEntryFromGoogle(ownerId: string, googleEventId: string | null): Promise<void> {
  if (!googleEventId) return
  try {
    const cal = await calendarForHost(ownerId)
    await cal.events.delete({ calendarId: 'primary', eventId: googleEventId, sendUpdates: 'none' })
  } catch (err) {
    console.error('[calendar-entry-sync] delete failed', googleEventId, err instanceof Error ? err.message : err)
  }
}

/** Pushes the owner's not-yet-synced upcoming entries (e.g. made before Google was connected). */
export async function pushPendingEntries(ownerId: string, limit = 10): Promise<void> {
  const rows = await prisma.calendarEntry.findMany({ where: { ownerId, googleEventId: null, endTime: { gt: new Date() } }, select: { id: true }, take: limit })
  for (const r of rows) if (!(await pushEntryToGoogle(r.id))) break // not connected / failing: stop early
}
