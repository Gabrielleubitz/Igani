import 'server-only'
import type { Booking } from '@prisma/client'
import { logActivity } from './audit'
import { createMeetEvent, listMeetEvents } from './calendar'
import { meetingCodeFromUrl, teamEventAttendees, teamEventSkipReason } from './meet-notes'
import { googleMeetingApi, syncMeeting, type MeetingApi } from './meetings'
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

export interface ImportResult {
  found: number
  imported: number
  withNotes: number
  /** Plain-English reasons (window, skipped events, Meet access) so "0 calls" is never a mystery. */
  diagnostics: string[]
}

/**
 * Imports past/upcoming team calls hosted by this user from their Google Calendar (Meet link, only @igani.co guests),
 * then checks each for real times and Gemini notes. Already-known events are skipped.
 */
export async function importTeamMeetings(hostId: string, opts: { daysBack?: number; daysAhead?: number; now?: Date; api?: MeetingApi } = {}): Promise<ImportResult> {
  const now = opts.now ?? new Date()
  const host = await prisma.user.findUniqueOrThrow({ where: { id: hostId }, select: { email: true } })
  const events = await listMeetEvents(hostId, new Date(now.getTime() - (opts.daysBack ?? 14) * 86_400_000), new Date(now.getTime() + (opts.daysAhead ?? 7) * 86_400_000))
  const from = new Date(now.getTime() - (opts.daysBack ?? 14) * 86_400_000)
  const diagnostics: string[] = [`Looked at Google Calendar and Meet from ${from.toISOString().slice(0, 16)}Z to now.`, `Calendar returned ${events.length} event(s) with a Meet link.`]
  let found = 0
  let imported = 0
  const ids: string[] = []
  for (const ev of events) {
    const attendees = teamEventAttendees(ev, host.email ?? '')
    const meetUrl = ev.hangoutLink ?? ev.conferenceData?.entryPoints?.find((p) => p.entryPointType === 'video')?.uri ?? null
    const start = ev.start?.dateTime ? new Date(ev.start.dateTime) : null
    const end = ev.end?.dateTime ? new Date(ev.end.dateTime) : null
    if (!attendees || !ev.id || !meetUrl || !meetingCodeFromUrl(meetUrl) || !start || !end) {
      const why = teamEventSkipReason(ev, host.email ?? '') ?? (!start || !end ? 'all-day or no time' : 'no usable Meet link')
      diagnostics.push(`Skipped "${ev.summary ?? 'untitled'}" (${ev.start?.dateTime ?? ev.start?.date ?? '?'}): ${why}.`)
      continue
    }
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
  // Calls with no Calendar event (instant meetings, "New meeting" in Meet) or no guests on the event: ask Meet directly.
  try {
    const api = opts.api ?? (await googleMeetingApi(hostId))
    if (!api.can.meet) diagnostics.push('Meet access is missing: reconnect Google (Connect Google) and accept the Meet and Docs permissions, then import again.')
    else if (api.recentConferences) {
      const recs = await api.recentConferences(from)
      diagnostics.push(`Meet returned ${recs.length} conference record(s) for you.`)
      const byCode = new Map<string, typeof recs>()
      for (const r of recs) byCode.set(r.meetingCode.toLowerCase(), [...(byCode.get(r.meetingCode.toLowerCase()) ?? []), r])
      for (const [code, group] of byCode) {
        const meetUrl = `https://meet.google.com/${code}`
        const known = await prisma.booking.findFirst({ where: { hostId, meetUrl: { contains: code } }, select: { id: true, startTime: true } })
        const sorted = [...group].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
        const start = new Date(sorted[0]!.startTime)
        const ends = sorted.flatMap((r) => (r.endTime ? [Date.parse(r.endTime)] : []))
        if (ends.length < sorted.length) {
          diagnostics.push(`Meet room ${code} is still live; import again after it ends.`)
          continue
        }
        const end = new Date(Math.max(...ends))
        if (known) {
          // A reused link (recurring room): only the first booking for it is tracked here.
          if (!ids.includes(known.id) && Math.abs(known.startTime.getTime() - start.getTime()) < 3 * 3600_000) ids.push(known.id)
          continue
        }
        const people = (await api.participants(sorted[0]!.name).catch(() => [])).length
        if (people < 2) {
          diagnostics.push(`Skipped Meet room ${code} (${start.toISOString().slice(0, 16)}Z): only ${people} participant(s).`)
          continue // solo room, not a team call
        }
        found++
        const row = await prisma.booking.create({
          data: { status: 'CONFIRMED', source: 'TEAM_MEETING', meetUrl, startTime: start, endTime: end, title: 'Team call', guestName: 'Team', guestEmail: (host.email ?? '').toLowerCase(), attendees: [(host.email ?? '').toLowerCase()], hostId, createdById: hostId, confirmedAt: now },
        })
        await logActivity({ entityType: 'BOOKING', entityId: row.id, action: 'team_meeting.imported', actorId: hostId })
        ids.push(row.id)
        imported++
      }
    }
  } catch (err) {
    console.error('[team-meetings] meet discovery failed', err)
    const e = err as { response?: { status?: number }; message?: string }
    diagnostics.push(`Meet lookup failed${e.response?.status ? ` (${e.response.status})` : ''}: ${(e.message ?? String(err)).slice(0, 160)}. Reconnect Google if this persists.`)
  }
  let withNotes = 0
  for (const id of ids) {
    const s = await syncMeeting(id, { now, force: true }).catch((err: unknown) => {
      console.error('[team-meetings] sync failed', id, err)
      return null
    })
    if (s?.notesStatus === 'READY') withNotes++
  }
  if (found === 0) diagnostics.push('No team call matched. Check the skipped list above.')
  return { found, imported, withNotes, diagnostics }
}
