import 'server-only'
import type { Booking } from '@prisma/client'
import { logActivity } from './audit'
import { createMeetEvent, listMeetEvents } from './calendar'
import { meetingCodeFromUrl, teamEventAttendees } from './meet-notes'
import { syncMeeting } from './meetings'
import { prisma } from './prisma'

/** Teammates a team call can invite: anyone on the allowlist with an email. */
export async function createTeamMeeting(input: { hostId: string; title: string; start: Date; end: Date; attendeeEmails: string[]; notes?: string }): Promise<Booking> {
  const host = await prisma.user.findUniqueOrThrow({ where: { id: input.hostId }, select: { email: true, name: true } })
  const hostEmail = (host.email ?? '').toLowerCase()
  const emails = [...new Set([hostEmail, ...input.attendeeEmails.map((e) => e.trim().toLowerCase())])].filter(Boolean)
  const row = await prisma.booking.create({
    data: {
      status: 'CONFIRMED', source: 'TEAM_MEETING', startTime: input.start, endTime: input.end, title: input.title, notes: input.notes ?? null,
      guestName: 'Team', guestEmail: hostEmail, attendees: emails, hostId: input.hostId, createdById: input.hostId, confirmedAt: new Date(),
    },
  })
  try {
    const ev = await createMeetEvent({ hostId: input.hostId, bookingId: row.id, title: input.title, description: [input.notes, 'Team meeting booked via Igani CRM.'].filter(Boolean).join('\n\n'), start: input.start, end: input.end, guestEmail: hostEmail, guestName: 'Team', attendeeEmails: emails })
    const done = await prisma.booking.update({ where: { id: row.id }, data: { meetUrl: ev.meetUrl, googleEventId: ev.eventId } })
    await logActivity({ entityType: 'BOOKING', entityId: row.id, action: 'team_meeting.created', actorId: input.hostId, metadata: { attendees: emails.length } })
    return done
  } catch (err) {
    await prisma.booking.delete({ where: { id: row.id } }).catch(() => undefined)
    throw err
  }
}

/**
 * Imports past/upcoming team calls hosted by this user from their Google Calendar (Meet link, only @igani.co guests),
 * then checks each for real times and Gemini notes. Already-known events are skipped.
 */
export async function importTeamMeetings(hostId: string, opts: { daysBack?: number; daysAhead?: number; now?: Date } = {}): Promise<{ found: number; imported: number; withNotes: number }> {
  const now = opts.now ?? new Date()
  const host = await prisma.user.findUniqueOrThrow({ where: { id: hostId }, select: { email: true } })
  const events = await listMeetEvents(hostId, new Date(now.getTime() - (opts.daysBack ?? 14) * 86_400_000), new Date(now.getTime() + (opts.daysAhead ?? 7) * 86_400_000))
  let found = 0
  let imported = 0
  const ids: string[] = []
  for (const ev of events) {
    const attendees = teamEventAttendees(ev, host.email ?? '')
    const meetUrl = ev.hangoutLink ?? ev.conferenceData?.entryPoints?.find((p) => p.entryPointType === 'video')?.uri ?? null
    const start = ev.start?.dateTime ? new Date(ev.start.dateTime) : null
    const end = ev.end?.dateTime ? new Date(ev.end.dateTime) : null
    if (!attendees || !ev.id || !meetUrl || !meetingCodeFromUrl(meetUrl) || !start || !end) continue
    found++
    const existing = await prisma.booking.findFirst({ where: { googleEventId: ev.id, hostId }, select: { id: true } })
    if (existing) {
      ids.push(existing.id)
      continue
    }
    const row = await prisma.booking.create({
      data: { status: 'CONFIRMED', source: 'TEAM_MEETING', meetUrl, googleEventId: ev.id, startTime: start, endTime: end, title: ev.summary?.trim() || 'Team meeting', guestName: 'Team', guestEmail: (host.email ?? '').toLowerCase(), attendees, hostId, createdById: hostId, confirmedAt: now },
    })
    await logActivity({ entityType: 'BOOKING', entityId: row.id, action: 'team_meeting.imported', actorId: hostId })
    ids.push(row.id)
    imported++
  }
  let withNotes = 0
  for (const id of ids) {
    const s = await syncMeeting(id, { now, force: true }).catch((err: unknown) => {
      console.error('[team-meetings] sync failed', id, err)
      return null
    })
    if (s?.notesStatus === 'READY') withNotes++
  }
  return { found, imported, withNotes }
}
