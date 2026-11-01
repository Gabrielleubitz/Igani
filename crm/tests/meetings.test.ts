/** Meet tracking + Gemini notes: pure helpers (always run) + the full sync against a fake Google (needs TEST_DATABASE_URL). */
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { teamEventAttendees, docIdFromUrl, docToText, hostHasGeminiNotes, looksLikeGeminiNotes, meetingCodeFromUrl, nextNotesCheck, parseGeminiNotes, pickConference } from '@/lib/meet-notes'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
vi.mock('@/lib/google', () => ({
  calendarForHost: async () => ({}),
  gmailForUser: async () => ({}),
  googleGetter: async () => async () => ({}),
  googleGrants: async () => ({ connected: true, gmail: true, meet: true, docs: true }),
}))

const DOC = 'a'.repeat(10) + 'B_c-' + 'd'.repeat(30)

describe('meet helpers', () => {
  it('calls hosted by the user with other guests (not CRM contact bookings) count as team meetings', () => {
    const ev = (o: object = {}) => ({ organizer: { email: 'gabrielleubitz@igani.co', self: true }, attendees: [{ email: 'gabrielleubitz@igani.co', self: true }, { email: 'Noa@igani.co' }, { email: 'room@resource.calendar.google.com', resource: true }], ...o })
    expect(teamEventAttendees(ev(), 'gabrielleubitz@igani.co')).toEqual(['gabrielleubitz@igani.co', 'noa@igani.co'])
    expect(teamEventAttendees(ev({ attendees: [{ email: 'gabrielleubitz@igani.co' }, { email: 'ilan@gmail.com' }] }), 'gabrielleubitz@igani.co')).toEqual(['gabrielleubitz@igani.co', 'ilan@gmail.com'])
    expect(teamEventAttendees(ev({ attendees: [{ email: 'gabrielleubitz@igani.co' }] }), 'gabrielleubitz@igani.co')).toBeNull()
    expect(teamEventAttendees(ev({ organizer: { email: 'noa@igani.co' } }), 'gabrielleubitz@igani.co')).toBeNull()
    expect(teamEventAttendees(ev({ status: 'cancelled' }), 'gabrielleubitz@igani.co')).toBeNull()
    expect(teamEventAttendees(ev({ extendedProperties: { private: { iganiBookingId: 'x' } } }), 'gabrielleubitz@igani.co')).toBeNull()
  })
  it('reads meeting codes and doc ids from links', () => {
    expect(meetingCodeFromUrl('https://meet.google.com/abc-defg-hij?authuser=0')).toBe('abc-defg-hij')
    expect(meetingCodeFromUrl('https://zoom.us/j/1')).toBeNull()
    expect(docIdFromUrl(`https://docs.google.com/document/d/${DOC}/edit?usp=meet_tnfm_email`)).toBe(DOC)
    expect(docIdFromUrl(`https://docs.google.com/document/u/0/d/${DOC}/edit`)).toBe(DOC)
  })
  it('only igani.co hosts get Gemini notes', () => {
    expect(hostHasGeminiNotes('Noa@Igani.co')).toBe(true)
    expect(hostHasGeminiNotes('noa@gmail.com')).toBe(false)
    expect(hostHasGeminiNotes('x@notigani.co.il')).toBe(false)
  })
  it('picks the records near the booking and merges re-opened rooms', () => {
    const booking = { startTime: new Date('2026-11-02T10:00:00Z'), endTime: new Date('2026-11-02T10:30:00Z') }
    const old = { name: 'conferenceRecords/old', startTime: '2026-10-20T10:00:00Z', endTime: '2026-10-20T10:20:00Z' }
    const a = { name: 'conferenceRecords/a', startTime: '2026-11-02T10:03:00Z', endTime: '2026-11-02T10:20:00Z' }
    const b = { name: 'conferenceRecords/b', startTime: '2026-11-02T10:22:00Z', endTime: '2026-11-02T10:41:00Z' }
    expect(pickConference([old], booking)).toBeNull()
    expect(pickConference([b, old, a], booking)).toEqual({ names: ['conferenceRecords/a', 'conferenceRecords/b'], start: new Date(a.startTime), end: new Date(b.endTime), live: false })
    expect(pickConference([a, { ...b, endTime: null }], booking)?.live).toBe(true)
  })
  it('backs off between notes checks', () => {
    const now = new Date('2026-11-02T11:00:00Z')
    expect(nextNotesCheck(0, now).getTime() - now.getTime()).toBe(3 * 60_000)
    expect(nextNotesCheck(20, now).getTime() - now.getTime()).toBe(60 * 60_000)
  })
  it('recognises Gemini notes titles, not transcripts', () => {
    expect(looksLikeGeminiNotes('Intro call - 2026/11/02 10:00 GMT+02:00 - Notes by Gemini')).toBe(true)
    expect(looksLikeGeminiNotes('Intro call - 2026/11/02 - Transcript')).toBe(false)
    expect(looksLikeGeminiNotes('Pricing.pdf')).toBe(false)
  })
  it('turns a tabbed Gemini Doc into text and splits summary / next steps', () => {
    const p = (text: string, style = 'NORMAL_TEXT', bullet = false) => ({ paragraph: { elements: [{ textRun: { content: `${text}\n` } }], paragraphStyle: { namedStyleType: style }, ...(bullet ? { bullet: {} } : {}) } })
    const text = docToText({
      title: 'Intro call - Notes by Gemini',
      tabs: [
        { tabProperties: { title: 'Notes' }, documentTab: { body: { content: [p('Intro call', 'TITLE'), p('Summary', 'HEADING_2'), p('Dana wants a new site by March. Budget approved.'), p('Details', 'HEADING_2'), p('Scope: 8 pages', 'NORMAL_TEXT', true), p('Suggested next steps', 'HEADING_2'), p('Noa will send a proposal', 'NORMAL_TEXT', true)] } } },
        { tabProperties: { title: 'Transcript' }, documentTab: { body: { content: [p('Noa: Hi Dana')] } } },
      ],
    })
    expect(text).toContain('## Summary')
    expect(text).toContain('• Scope: 8 pages')
    expect(text).not.toContain('Noa: Hi Dana')
    expect(parseGeminiNotes(text)).toEqual({ summary: 'Dana wants a new site by March. Budget approved.', nextSteps: '• Noa will send a proposal' })
    expect(parseGeminiNotes('random text')).toEqual({ summary: null, nextSteps: null })
  })
})

const d = testDb ? describe : describe.skip

d('syncMeeting', async () => {
  const { syncMeeting, syncDueMeetings } = await import('@/lib/meetings')
  type MeetingApi = import('@/lib/meetings').MeetingApi
  const prisma = new PrismaClient()
  const start = new Date('2026-11-02T10:00:00Z')
  const end = new Date('2026-11-02T10:30:00Z')
  const at = (iso: string) => new Date(iso)

  const fakeApi = (state: { records: { name: string; startTime: string; endTime?: string | null }[]; calendar?: { docId: string; title: string }[]; mails?: { subject: string; docIds: string[] }[]; docError?: boolean }, can = { meet: true, docs: true, gmail: true }): MeetingApi & { reads: string[] } => {
    const reads: string[] = []
    return {
      reads,
      can,
      conferences: async () => state.records,
      participants: async () => [{ name: 'Noa', joinedAt: '2026-11-02T10:02:00Z', leftAt: '2026-11-02T10:41:00Z', seconds: 2340 }, { name: 'Dana Levi', joinedAt: '2026-11-02T10:04:00Z', leftAt: '2026-11-02T10:40:00Z', seconds: 2160 }],
      meetDocs: async () => [],
      calendarDocs: async () => (state.calendar ?? []).map((c) => ({ ...c, source: 'CALENDAR' as const })),
      gmailDocs: async () => state.mails ?? [],
      readDoc: async (id) => {
        reads.push(id)
        if (state.docError) throw Object.assign(new Error('forbidden'), { response: { status: 403 } })
        return { title: 'Intro call - Notes by Gemini', text: '# Intro call\n## Summary\nDana wants a new site.\n## Suggested next steps\n• Send proposal' }
      },
    }
  }

  async function seed(hostEmail = 'noa@igani.co') {
    const host = await prisma.user.create({ data: { email: hostEmail, name: 'Noa', role: 'SALES' } })
    const lead = await prisma.lead.create({ data: { email: 'dana@acme.com', firstName: 'Dana' } })
    const booking = await prisma.booking.create({
      data: { status: 'CONFIRMED', source: 'SALES_INVITE', meetUrl: 'https://meet.google.com/abc-defg-hij', googleEventId: 'ev1', startTime: start, endTime: end, title: 'Intro call', guestName: 'Dana', guestEmail: 'dana@acme.com', hostId: host.id, leadId: lead.id },
    })
    return { host, lead, booking }
  }
  const actions = async (leadId: string) => (await prisma.activityLog.findMany({ where: { entityId: leadId }, orderBy: { createdAt: 'asc' } })).map((l) => l.action)

  beforeEach(async () => {
    await prisma.meetingSession.deleteMany()
    await prisma.emailMessage.deleteMany()
    await prisma.activityLog.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
  })
  afterAll(async () => prisma.$disconnect())

  it('waits until the call is near, then tracks live → ended → notes ready (logged once)', async () => {
    const { booking, lead } = await seed()
    const state: Parameters<typeof fakeApi>[0] = { records: [] }
    const api = fakeApi(state)
    expect(await syncMeeting(booking.id, { api, now: at('2026-11-02T09:00:00Z') })).toBeNull()

    state.records = [{ name: 'conferenceRecords/r1', startTime: '2026-11-02T10:02:00Z', endTime: null }]
    let s = await syncMeeting(booking.id, { api, now: at('2026-11-02T10:05:00Z') })
    expect(s).toMatchObject({ status: 'LIVE', actualStart: at('2026-11-02T10:02:00Z'), actualEnd: null, notesStatus: null })
    await syncMeeting(booking.id, { api, now: at('2026-11-02T10:10:00Z') })

    state.records = [{ name: 'conferenceRecords/r1', startTime: '2026-11-02T10:02:00Z', endTime: '2026-11-02T10:41:00Z' }]
    s = await syncMeeting(booking.id, { api, now: at('2026-11-02T10:42:00Z') })
    expect(s).toMatchObject({ status: 'ENDED', actualEnd: at('2026-11-02T10:41:00Z'), notesStatus: 'WAITING', notesAttempts: 1 })
    expect((s!.participants as { name: string }[]).map((p) => p.name)).toEqual(['Noa', 'Dana Levi'])
    expect(s!.nextCheckAt).toEqual(at('2026-11-02T10:45:00Z'))

    // Too early for the next check: nothing happens.
    s = await syncMeeting(booking.id, { api, now: at('2026-11-02T10:43:00Z') })
    expect(s!.notesAttempts).toBe(1)

    // Gemini attached the notes to the calendar event.
    state.calendar = [{ docId: 'doc-transcript', title: 'Intro call - Transcript' }, { docId: 'doc-notes', title: 'Intro call - Notes by Gemini' }]
    s = await syncMeeting(booking.id, { api, now: at('2026-11-02T10:46:00Z') })
    expect(s).toMatchObject({ notesStatus: 'READY', notesSource: 'CALENDAR', docId: 'doc-notes', summaryText: 'Dana wants a new site.', nextStepsText: '• Send proposal', docUrl: 'https://docs.google.com/document/d/doc-notes/edit' })
    await syncMeeting(booking.id, { api, now: at('2026-11-02T11:30:00Z'), force: true })
    expect(api.reads).toEqual(['doc-notes'])
    expect(await actions(lead.id)).toEqual(['meeting.started', 'meeting.ended', 'meeting.notes'])
  })

  it('finds the notes through the Gemini email when the event has no attachment', async () => {
    const { booking } = await seed()
    const api = fakeApi({
      records: [{ name: 'conferenceRecords/r1', startTime: '2026-11-02T10:01:00Z', endTime: '2026-11-02T10:31:00Z' }],
      mails: [
        { subject: 'Notes: “Other meeting” Nov 2, 2026', docIds: ['doc-other'] },
        { subject: 'Notes: “Intro call” Nov 2, 2026', docIds: ['doc-mail'] },
      ],
    })
    const s = await syncMeeting(booking.id, { api, now: at('2026-11-02T10:40:00Z') })
    expect(s).toMatchObject({ status: 'ENDED', notesStatus: 'READY', notesSource: 'GMAIL', docId: 'doc-mail' })
  })

  it('keeps the link when the Doc cannot be read, and hosts outside igani.co get times only', async () => {
    const { booking } = await seed()
    const api = fakeApi({ records: [{ name: 'conferenceRecords/r1', startTime: '2026-11-02T10:01:00Z', endTime: '2026-11-02T10:31:00Z' }], calendar: [{ docId: 'doc-notes', title: 'Notes by Gemini' }], docError: true })
    const s = await syncMeeting(booking.id, { api, now: at('2026-11-02T10:40:00Z') })
    expect(s).toMatchObject({ notesStatus: 'LINK_ONLY', docUrl: 'https://docs.google.com/document/d/doc-notes/edit' })
    expect(s!.lastError).toContain('403')

    await prisma.meetingSession.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    const other = await seed('noa@gmail.com')
    const s2 = await syncMeeting(other.booking.id, { api: fakeApi({ records: [{ name: 'conferenceRecords/r1', startTime: '2026-11-02T10:01:00Z', endTime: '2026-11-02T10:31:00Z' }] }), now: at('2026-11-02T10:40:00Z') })
    expect(s2).toMatchObject({ status: 'ENDED', notesStatus: 'NOT_AVAILABLE' })
  })

  it('marks calls nobody joined as not held, and gives up on notes after 24 h', async () => {
    const { booking, lead } = await seed()
    const api = fakeApi({ records: [] })
    expect(await syncMeeting(booking.id, { api, now: at('2026-11-02T10:45:00Z') })).toMatchObject({ status: 'SCHEDULED' })
    expect(await syncMeeting(booking.id, { api, now: at('2026-11-02T11:31:00Z') })).toMatchObject({ status: 'NOT_HELD', notesStatus: null })
    expect(await actions(lead.id)).toEqual(['meeting.not_held'])

    const two = await prisma.booking.create({ data: { ...booking, id: undefined, attendees: undefined, inviteToken: null, createdAt: undefined, updatedAt: undefined, meetUrl: 'https://meet.google.com/xyz-abcd-efg' } })
    const api2 = fakeApi({ records: [{ name: 'conferenceRecords/r2', startTime: '2026-11-02T10:01:00Z', endTime: '2026-11-02T10:31:00Z' }] })
    await syncMeeting(two.id, { api: api2, now: at('2026-11-02T10:40:00Z') })
    expect(await syncMeeting(two.id, { api: api2, now: at('2026-11-03T11:00:00Z') })).toMatchObject({ notesStatus: 'NONE', nextCheckAt: null })
  })

  it('without the Meet permission, still pulls notes after the scheduled end', async () => {
    const { booking } = await seed()
    const api = fakeApi({ records: [], calendar: [{ docId: 'doc-notes', title: 'Notes by Gemini' }] }, { meet: false, docs: true, gmail: true })
    expect(await syncMeeting(booking.id, { api, now: at('2026-11-02T10:10:00Z') })).toMatchObject({ status: 'SCHEDULED', lastError: 'meet-scope-missing', notesStatus: null })
    expect(await syncMeeting(booking.id, { api, now: at('2026-11-02T10:35:00Z') })).toMatchObject({ status: 'SCHEDULED', notesStatus: 'READY' })
  })

  it('tracks a team meeting (no contact) through to Gemini notes', async () => {
    const host = await prisma.user.create({ data: { email: 'gabrielleubitz@igani.co', name: 'Gabi', role: 'ADMIN' } })
    const b = await prisma.booking.create({
      data: { status: 'CONFIRMED', source: 'TEAM_MEETING', meetUrl: 'https://meet.google.com/abc-defg-hij', googleEventId: 'tm1', startTime: start, endTime: end, title: 'Team sync', guestName: 'Team', guestEmail: host.email!, attendees: [host.email!], hostId: host.id },
    })
    const api = fakeApi({ records: [{ name: 'conferenceRecords/t1', startTime: '2026-11-02T10:01:00Z', endTime: '2026-11-02T10:31:00Z' }], calendar: [{ docId: 'doc-team', title: 'Team sync - Notes by Gemini' }] })
    const s = await syncMeeting(b.id, { api, now: at('2026-11-02T10:40:00Z') })
    expect(s).toMatchObject({ status: 'ENDED', notesStatus: 'READY', summaryText: 'Dana wants a new site.' })
  })

  it('syncDueMeetings selects only calls that need a look', async () => {
    await seed()
    const r = await syncDueMeetings({ now: at('2026-11-02T08:00:00Z') })
    expect(r.checked).toBe(0)
  })
})
