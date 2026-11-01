import { createMeetingTasks } from './meeting-tasks'
import { tidyWithAI } from './meeting-ai'
import 'server-only'
import type { MeetingSession, Prisma } from '@prisma/client'
import { logActivity } from './audit'
import { calendarForHost, gmailForUser, googleGetter, googleGrants } from './google'
import {
  NOTES_GIVE_UP_MS,
  NOTES_TEXT_CAP,
  docIdFromUrl,
  docToText,
  docUrl,
  hostHasGeminiNotes,
  looksLikeGeminiNotes,
  meetingCodeFromUrl,
  nextNotesCheck,
  normTitle,
  parseGeminiNotes,
  pickConference,
  type ConferenceRec,
  type DocsDocument,
} from './meet-notes'
import { prisma } from './prisma'

export interface Participant {
  name: string
  joinedAt: string | null
  leftAt: string | null
  seconds: number
}
export interface DocRef {
  docId: string
  title?: string | null
  source: 'CALENDAR' | 'MEET_SMART_NOTES' | 'MEET_TRANSCRIPT' | 'GMAIL'
}

/** The Google calls the tracker needs, as the meeting host (tests pass a fake). */
export interface MeetingApi {
  can: { meet: boolean; docs: boolean; gmail: boolean }
  conferences(meetingCode: string): Promise<ConferenceRec[]>
  /** Calls the host ran recently, found via Meet itself (covers instant meetings that have no Calendar event). */
  recentConferences?(since: Date): Promise<(ConferenceRec & { meetingCode: string })[]>
  participants(record: string): Promise<Participant[]>
  meetDocs(record: string, transcripts: boolean): Promise<DocRef[]>
  calendarDocs(eventId: string): Promise<DocRef[]>
  gmailDocs(after: Date, before: Date): Promise<{ subject: string; docIds: string[] }[]>
  readDoc(docId: string): Promise<{ title: string | null; text: string }>
}

const MEET = 'https://meet.googleapis.com/v2'

function decodePart(p: { body?: { data?: string | null } | null; parts?: unknown[] | null } | undefined, out: string[]): void {
  if (!p) return
  if (p.body?.data) out.push(Buffer.from(p.body.data, 'base64url').toString('utf8'))
  for (const c of (p.parts ?? []) as (typeof p)[]) decodePart(c, out)
}

/** Live Google implementation for one host. */
export async function googleMeetingApi(hostId: string): Promise<MeetingApi> {
  const grants = await googleGrants(hostId)
  const get = await googleGetter(hostId)
  return {
    can: { meet: grants.meet, docs: grants.docs, gmail: grants.gmail },
    async conferences(code) {
      const filter = encodeURIComponent(`space.meeting_code = "${code}"`)
      const r = await get<{ conferenceRecords?: ConferenceRec[] }>(`${MEET}/conferenceRecords?filter=${filter}&pageSize=25`)
      return r.conferenceRecords ?? []
    },
    async recentConferences(since) {
      const filter = encodeURIComponent(`start_time>="${since.toISOString()}"`)
      const recs: (ConferenceRec & { space?: string })[] = []
      let token = ''
      for (let i = 0; i < 5; i++) {
        const r = await get<{ conferenceRecords?: (ConferenceRec & { space?: string })[]; nextPageToken?: string }>(`${MEET}/conferenceRecords?filter=${filter}&pageSize=100${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`)
        recs.push(...(r.conferenceRecords ?? []))
        if (!r.nextPageToken) break
        token = r.nextPageToken
      }
      const codes = new Map<string, string>()
      const spaces = [...new Set(recs.flatMap((x) => (x.space ? [x.space] : [])))]
      const failed: string[] = []
      await Promise.all(
        spaces.map(async (sp) => {
          try {
            const r = await get<{ meetingCode?: string }>(`${MEET}/${sp}`)
            if (r.meetingCode) codes.set(sp, r.meetingCode)
          } catch (err) {
            failed.push(`${sp}: ${errText(err)}`)
          }
        }),
      )
      // Surface lookup failures instead of silently dropping the calls (the importer reports this to the admin).
      if (failed.length) throw new Error(`could not read ${failed.length} Meet space(s): ${failed[0]}`)
      return recs.flatMap((x) => (x.space && codes.get(x.space) ? [{ name: x.name, startTime: x.startTime, endTime: x.endTime ?? null, meetingCode: codes.get(x.space)! }] : []))
    },
    async participants(record) {
      const out: Participant[] = []
      let token = ''
      for (let i = 0; i < 5; i++) {
        const r = await get<{
          participants?: { earliestStartTime?: string; latestEndTime?: string; signedinUser?: { displayName?: string }; anonymousUser?: { displayName?: string }; phoneUser?: { displayName?: string } }[]
          nextPageToken?: string
        }>(`${MEET}/${record}/participants?pageSize=100${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`)
        for (const p of r.participants ?? []) {
          const joined = p.earliestStartTime ?? null
          const left = p.latestEndTime ?? null
          out.push({
            name: p.signedinUser?.displayName ?? p.anonymousUser?.displayName ?? p.phoneUser?.displayName ?? 'Guest',
            joinedAt: joined,
            leftAt: left,
            seconds: joined && left ? Math.max(0, Math.round((Date.parse(left) - Date.parse(joined)) / 1000)) : 0,
          })
        }
        if (!r.nextPageToken) break
        token = r.nextPageToken
      }
      return out
    },
    async meetDocs(record, transcripts) {
      const refs: DocRef[] = []
      type Dest = { docsDestination?: { document?: string } }
      // Smart notes (Gemini "Take notes for me"); not available on every account, so failures are ignored.
      const notes = await get<{ smartNotes?: Dest[] }>(`${MEET}/${record}/smartNotes`).catch(() => ({ smartNotes: [] as Dest[] }))
      for (const n of notes.smartNotes ?? []) if (n.docsDestination?.document) refs.push({ docId: n.docsDestination.document, source: 'MEET_SMART_NOTES' })
      if (transcripts) {
        const t = await get<{ transcripts?: Dest[] }>(`${MEET}/${record}/transcripts`).catch(() => ({ transcripts: [] as Dest[] }))
        for (const n of t.transcripts ?? []) if (n.docsDestination?.document) refs.push({ docId: n.docsDestination.document, source: 'MEET_TRANSCRIPT' })
      }
      return refs
    },
    async calendarDocs(eventId) {
      const cal = await calendarForHost(hostId)
      const ev = await cal.events.get({ calendarId: 'primary', eventId })
      return (ev.data.attachments ?? []).flatMap((a): DocRef[] => {
        const id = a.fileId ?? docIdFromUrl(a.fileUrl)
        return id && (a.mimeType === 'application/vnd.google-apps.document' || docIdFromUrl(a.fileUrl)) ? [{ docId: id, title: a.title, source: 'CALENDAR' }] : []
      })
    },
    async gmailDocs(after, before) {
      const g = await gmailForUser(hostId)
      const q = `from:(gemini-notes@google.com OR meet-recordings-noreply@google.com) after:${Math.floor(after.getTime() / 1000)} before:${Math.ceil(before.getTime() / 1000)}`
      const list = await g.users.messages.list({ userId: 'me', q, maxResults: 20 })
      const out: { subject: string; docIds: string[] }[] = []
      for (const m of list.data.messages ?? []) {
        if (!m.id) continue
        const full = await g.users.messages.get({ userId: 'me', id: m.id, format: 'full' })
        const subject = full.data.payload?.headers?.find((h) => h.name?.toLowerCase() === 'subject')?.value ?? ''
        const bodies: string[] = []
        decodePart(full.data.payload ?? undefined, bodies)
        const ids = [...new Set([...bodies.join('\n').matchAll(/docs\.google\.com\/document\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]{20,})/g)].map((x) => x[1]!))]
        out.push({ subject, docIds: ids })
      }
      return out
    },
    async readDoc(docId) {
      const doc = await get<DocsDocument>(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}?includeTabsContent=true`)
      return { title: doc.title ?? null, text: docToText(doc) }
    },
  }
}

type BookingRow = Prisma.BookingGetPayload<{ include: { host: { select: { email: true } }; meeting: true } }>

function errText(err: unknown): string {
  const e = err as { response?: { status?: number; data?: { error?: { message?: string } } }; message?: string }
  const status = e.response?.status
  const msg = e.response?.data?.error?.message ?? e.message ?? String(err)
  return `${status ? `${status} ` : ''}${msg}`.slice(0, 300)
}

/** Log on the contact timeline (only when the booking is tied to a contact). */
async function logOnLead(b: BookingRow, action: string, metadata: Record<string, unknown>): Promise<void> {
  if (b.leadId) await logActivity({ entityType: 'LEAD', entityId: b.leadId, action, metadata: { bookingId: b.id, title: b.title, ...metadata } })
}

/** Moves the session from one status to another exactly once (concurrent runs can't both log the change). */
async function transition(id: string, from: MeetingSession['status'], data: Prisma.MeetingSessionUpdateManyMutationInput): Promise<boolean> {
  return (await prisma.meetingSession.updateMany({ where: { id, status: from }, data })).count === 1
}

/** Step 1: real start/end from the Meet conference records. */
async function trackTimes(b: BookingRow, s: MeetingSession, api: MeetingApi, now: Date): Promise<MeetingSession> {
  if (s.status === 'ENDED' || s.status === 'NOT_HELD') return s
  if (!api.can.meet) {
    await prisma.meetingSession.update({ where: { id: s.id }, data: { lastCheckedAt: now, lastError: 'meet-scope-missing' } })
    return { ...s, lastError: 'meet-scope-missing' }
  }
  const rec = pickConference(await api.conferences(s.meetingCode), b)
  if (!rec) {
    // Nobody opened the room by an hour after the scheduled end: the call didn't happen.
    if (now.getTime() > b.endTime.getTime() + 3600_000 && (await transition(s.id, s.status, { status: 'NOT_HELD', lastCheckedAt: now, lastError: null }))) {
      await logOnLead(b, 'meeting.not_held', {})
      return { ...s, status: 'NOT_HELD' }
    }
    await prisma.meetingSession.update({ where: { id: s.id }, data: { lastCheckedAt: now, lastError: null } })
    return s
  }
  let participants: Participant[] | undefined
  if (!rec.live) participants = (await Promise.all(rec.names.map((n) => api.participants(n).catch(() => [] as Participant[])))).flat()
  const base = { conferenceRecord: rec.names[0]!, actualStart: rec.start, lastCheckedAt: now, lastError: null }
  if (rec.live) {
    if (s.status === 'SCHEDULED' && (await transition(s.id, 'SCHEDULED', { ...base, status: 'LIVE' }))) await logOnLead(b, 'meeting.started', { at: rec.start.toISOString() })
    else await prisma.meetingSession.update({ where: { id: s.id }, data: base })
    return { ...s, ...base, status: 'LIVE' }
  }
  const end = rec.end!
  const ended = { ...base, actualEnd: end, status: 'ENDED' as const, participants: (participants ?? []) as unknown as Prisma.InputJsonValue }
  if (await transition(s.id, s.status, ended)) {
    if (s.status === 'SCHEDULED') await logOnLead(b, 'meeting.started', { at: rec.start.toISOString() })
    await logOnLead(b, 'meeting.ended', { at: end.toISOString(), minutes: Math.round((end.getTime() - rec.start.getTime()) / 60_000), people: (participants ?? []).map((p) => p.name).slice(0, 10) })
  }
  return { ...s, ...ended, participants: ended.participants as Prisma.JsonValue }
}

/** Step 2: find the Gemini notes Doc and pull its text in. */
async function trackNotes(b: BookingRow, s: MeetingSession, api: MeetingApi, now: Date, force: boolean, notesEmail?: string | null): Promise<void> {
  // Notes exist only after the call ends. Without Meet access we fall back to the scheduled end.
  const endedAt = s.status === 'ENDED' ? s.actualEnd : s.status !== 'NOT_HELD' && !api.can.meet && now > b.endTime ? b.endTime : null
  if (!endedAt) return
  if (!hostHasGeminiNotes(notesEmail ?? b.host.email)) {
    if (s.notesStatus !== 'NOT_AVAILABLE') await prisma.meetingSession.update({ where: { id: s.id }, data: { notesStatus: 'NOT_AVAILABLE', nextCheckAt: null } })
    return
  }
  if (s.notesStatus === 'READY' || s.notesStatus === 'NOT_AVAILABLE') return
  if (s.notesStatus === 'NONE' && !force) return
  if (!force && s.nextCheckAt && s.nextCheckAt > now) return

  const refs: DocRef[] = []
  const errors: string[] = []
  const tryFind = async (label: string, fn: () => Promise<DocRef[]>): Promise<void> => {
    if (refs.length) return
    try {
      refs.push(...(await fn()))
    } catch (err) {
      errors.push(`${label}: ${errText(err)}`)
    }
  }
  if (s.docId) refs.push({ docId: s.docId, title: s.docTitle, source: (s.notesSource as DocRef['source']) ?? 'CALENDAR' })
  if (b.googleEventId) await tryFind('calendar', async () => (await api.calendarDocs(b.googleEventId!)).filter((d) => looksLikeGeminiNotes(d.title)))
  if (api.can.meet && s.conferenceRecord) await tryFind('meet', () => api.meetDocs(s.conferenceRecord!, false))
  if (api.can.gmail) {
    await tryFind('gmail', async () => {
      const mails = await api.gmailDocs(new Date(endedAt.getTime() - 10 * 60_000), new Date(Math.max(now.getTime(), endedAt.getTime()) + 60_000))
      const want = normTitle(b.title)
      const titled = mails.filter((m) => want && normTitle(m.subject).includes(want))
      const notes = (titled.length ? titled : mails.length === 1 ? mails : []).filter((m) => /^notes\b/i.test(m.subject.trim()) || titled.length > 0)
      return notes.flatMap((m) => m.docIds.slice(0, 1).map((docId) => ({ docId, title: m.subject, source: 'GMAIL' as const })))
    })
  }
  // A transcript is better than nothing once the notes had plenty of time to show up.
  if (api.can.meet && s.conferenceRecord && s.notesAttempts >= 4) await tryFind('transcript', () => api.meetDocs(s.conferenceRecord!, true))

  const attempts = s.notesAttempts + 1
  const giveUp = now.getTime() - endedAt.getTime() > NOTES_GIVE_UP_MS
  const ref = refs[0]
  if (!ref) {
    await prisma.meetingSession.update({
      where: { id: s.id },
      data: { notesStatus: giveUp ? 'NONE' : 'WAITING', notesAttempts: attempts, nextCheckAt: giveUp ? null : nextNotesCheck(s.notesAttempts, now), lastError: errors.join(' · ') || null },
    })
    return
  }
  const link = { docId: ref.docId, docUrl: docUrl(ref.docId), docTitle: ref.title ?? s.docTitle, notesSource: ref.source }
  if (!api.can.docs) {
    await prisma.meetingSession.update({
      where: { id: s.id },
      data: { ...link, notesStatus: 'LINK_ONLY', notesAttempts: attempts, nextCheckAt: giveUp ? null : nextNotesCheck(s.notesAttempts, now), lastError: 'docs-scope-missing' },
    })
    if (s.notesStatus !== 'LINK_ONLY') await logOnLead(b, 'meeting.notes', { docUrl: link.docUrl })
    return
  }
  try {
    const doc = await api.readDoc(ref.docId)
    const text = doc.text.slice(0, NOTES_TEXT_CAP)
    const { summary, nextSteps } = parseGeminiNotes(text)
    const organized = await tidyWithAI(text)
    const done = await prisma.meetingSession.updateMany({
      where: { id: s.id, OR: [{ notesStatus: null }, { notesStatus: { not: 'READY' } }] },
      data: { ...link, docTitle: doc.title ?? link.docTitle, notesStatus: 'READY', summaryText: summary, nextStepsText: nextSteps, fullText: text, organizedJson: organized ?? undefined, notesAttempts: attempts, nextCheckAt: null, notesFetchedAt: now, lastError: null },
    })
    if (done.count === 1) {
      await logOnLead(b, 'meeting.notes', { docUrl: link.docUrl, summary: (summary ?? text).slice(0, 1200) })
      await createMeetingTasks(b.id).catch((err: unknown) => console.error('[meetings] action-item tasks failed', err))
    }
  } catch (err) {
    await prisma.meetingSession.update({
      where: { id: s.id },
      data: { ...link, notesStatus: 'LINK_ONLY', notesAttempts: attempts, nextCheckAt: giveUp ? null : nextNotesCheck(s.notesAttempts, now), lastError: `doc: ${errText(err)}` },
    })
    if (s.notesStatus !== 'LINK_ONLY') await logOnLead(b, 'meeting.notes', { docUrl: link.docUrl })
  }
}

/** Check one CRM-scheduled Meet call: record start/end, then pull the Gemini notes once they exist. */
export async function syncMeeting(bookingId: string, opts: { api?: MeetingApi; now?: Date; force?: boolean; /** Sync with another teammate's Google (they hold the notes), and use their email for the Gemini check. */ asEmail?: string | null } = {}): Promise<MeetingSession | null> {
  const now = opts.now ?? new Date()
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: { host: { select: { email: true } }, meeting: true } })
  const code = meetingCodeFromUrl(b?.meetUrl)
  if (!b || !code || b.status !== 'CONFIRMED') return b?.meeting ?? null
  if (now.getTime() < b.startTime.getTime() - 10 * 60_000) return b.meeting
  let s = b.meeting ?? (await prisma.meetingSession.upsert({ where: { bookingId }, create: { bookingId, meetingCode: code }, update: {} }))
  const api = opts.api ?? (await googleMeetingApi(b.hostId))
  try {
    s = await trackTimes(b, s, api, now)
  } catch (err) {
    await prisma.meetingSession.update({ where: { id: s.id }, data: { lastCheckedAt: now, lastError: `meet: ${errText(err)}` } })
  }
  await trackNotes(b, s, api, now, opts.force ?? false, opts.asEmail)
  return prisma.meetingSession.findUnique({ where: { bookingId } })
}

/**
 * Every call that needs a look now: started (or about to), not finished tracking, or still waiting for notes.
 * Optional filters keep page-triggered checks small (one host or one contact).
 */
export async function syncDueMeetings(opts: { hostId?: string; leadId?: string; now?: Date; limit?: number; minGapMs?: number } = {}): Promise<{ checked: number; failed: number }> {
  const now = opts.now ?? new Date()
  const found = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      meetUrl: { not: null },
      startTime: { lte: new Date(now.getTime() + 10 * 60_000) },
      endTime: { gte: new Date(now.getTime() - NOTES_GIVE_UP_MS - 6 * 3600_000) },
      ...(opts.hostId ? { hostId: opts.hostId } : {}),
      ...(opts.leadId ? { leadId: opts.leadId } : {}),
      OR: [
        { meeting: { is: null } },
        { meeting: { is: { status: { in: ['SCHEDULED', 'LIVE'] } } } },
        { meeting: { is: { notesStatus: null, status: 'ENDED' } } },
        { meeting: { is: { notesStatus: { in: ['WAITING', 'LINK_ONLY'] }, OR: [{ nextCheckAt: null }, { nextCheckAt: { lte: now } }] } } },
      ],
    },
    select: { id: true, hostId: true, meeting: { select: { lastCheckedAt: true } } },
    orderBy: { startTime: 'desc' },
    take: opts.limit ?? 50,
  })
  // Page-triggered checks skip calls looked at a moment ago (several open tabs must not hammer Google).
  const gap = opts.minGapMs ?? 0
  const rows = gap ? found.filter((r) => !r.meeting?.lastCheckedAt || now.getTime() - r.meeting.lastCheckedAt.getTime() >= gap) : found
  const apis = new Map<string, MeetingApi | null>()
  let failed = 0
  for (const r of rows) {
    if (!apis.has(r.hostId)) apis.set(r.hostId, await googleMeetingApi(r.hostId).catch(() => null))
    const api = apis.get(r.hostId)
    if (!api) {
      failed++
      continue
    }
    try {
      await syncMeeting(r.id, { api, now })
    } catch (err) {
      failed++
      console.error('[meetings] sync failed', r.id, errText(err))
    }
  }
  return { checked: rows.length, failed }
}
