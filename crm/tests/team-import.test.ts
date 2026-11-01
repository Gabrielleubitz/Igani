/** Team meetings import: Meet discovery (instant / no-guest calls) and the diagnostics shown when nothing is found. Mocked Google + DB, always runs. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MeetingApi } from '@/lib/meetings'

const created: { data: Record<string, unknown> }[] = []
let known: { id: string; startTime: Date } | null = null
let events: object[] = []
vi.mock('@/lib/audit', () => ({ logActivity: async () => undefined }))
vi.mock('@/lib/calendar', () => ({ createMeetEvent: async () => ({}), listMeetEvents: async () => events }))
vi.mock('@/lib/meetings', () => ({ googleMeetingApi: async () => ({}), syncMeeting: async () => ({ notesStatus: 'READY' }) }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUniqueOrThrow: async () => ({ email: 'gabrielleubitz@igani.co' }) },
    booking: {
      findFirst: async () => known,
      create: async (a: { data: Record<string, unknown> }) => {
        created.push(a)
        return { id: `b${created.length}` }
      },
    },
  },
}))

const { importTeamMeetings } = await import('@/lib/team-meetings')

const now = new Date('2026-11-01T09:00:00Z')
const rec = (name: string, startTime: string, endTime: string | null, meetingCode = 'abc-defg-hij') => ({ name, startTime, endTime, meetingCode })
const api = (o: { meet?: boolean; recs?: ReturnType<typeof rec>[]; people?: number; fail?: boolean }): MeetingApi =>
  ({
    can: { meet: o.meet ?? true, docs: true, gmail: true },
    conferences: async () => [],
    recentConferences: async () => {
      if (o.fail) throw new Error('boom')
      return o.recs ?? []
    },
    participants: async () => Array.from({ length: o.people ?? 3 }, () => ({ name: 'x', joinedAt: null, leftAt: null, seconds: 0 })),
    meetDocs: async () => [],
    calendarDocs: async () => [],
    gmailDocs: async () => [],
    readDoc: async () => ({ title: null, text: '' }),
  }) as MeetingApi

beforeEach(() => {
  created.length = 0
  known = null
  events = []
})

describe('importTeamMeetings', () => {
  it('imports an instant call (no Calendar event) found through Meet and pulls its notes', async () => {
    const r = await importTeamMeetings('h', { now, api: api({ recs: [rec('conferenceRecords/1', '2026-10-31T13:00:00Z', '2026-10-31T13:40:00Z')] }) })
    expect(r).toMatchObject({ found: 1, imported: 1, withNotes: 1 })
    expect(created[0]!.data).toMatchObject({ source: 'TEAM_MEETING', meetUrl: 'https://meet.google.com/abc-defg-hij' })
  })
  it('skips a solo room and says why', async () => {
    const r = await importTeamMeetings('h', { now, api: api({ people: 1, recs: [rec('conferenceRecords/1', '2026-10-31T13:00:00Z', '2026-10-31T13:05:00Z')] }) })
    expect(r.found).toBe(0)
    expect(r.diagnostics.join(' ')).toMatch(/only 1 participant/)
  })
  it('skips a still-live call and says so', async () => {
    const r = await importTeamMeetings('h', { now, api: api({ recs: [rec('conferenceRecords/1', '2026-11-01T08:00:00Z', null)] }) })
    expect(r.imported).toBe(0)
    expect(r.diagnostics.join(' ')).toMatch(/still live/)
  })
  it('does not duplicate a reused link that is already a booking', async () => {
    known = { id: 'old', startTime: new Date('2026-10-31T13:00:00Z') }
    const r = await importTeamMeetings('h', { now, api: api({ recs: [rec('conferenceRecords/1', '2026-10-31T13:00:00Z', '2026-10-31T13:40:00Z')] }) })
    expect(created).toHaveLength(0)
    expect(r).toMatchObject({ found: 0, imported: 0, withNotes: 1 })
  })
  it('tells the admin to reconnect Google when Meet access is missing', async () => {
    const r = await importTeamMeetings('h', { now, api: api({ meet: false }) })
    expect(r.diagnostics.join(' ')).toMatch(/reconnect Google/i)
  })
  it('reports a Meet lookup failure', async () => {
    const r = await importTeamMeetings('h', { now, api: api({ fail: true }) })
    expect(r.diagnostics.join(' ')).toMatch(/Meet lookup failed.*boom/)
  })
  it('explains why Calendar events were dropped', async () => {
    events = [{ id: 'e1', summary: 'Weekly', hangoutLink: 'https://meet.google.com/aaa-bbbb-ccc', organizer: { email: 'other@x.com' }, attendees: [{ email: 'gabrielleubitz@igani.co' }, { email: 'n@igani.co' }], start: { dateTime: '2026-10-31T13:00:00Z' }, end: { dateTime: '2026-10-31T13:30:00Z' } }]
    const r = await importTeamMeetings('h', { now, api: api({}) })
    expect(r.found).toBe(0)
    expect(r.diagnostics.join(' ')).toMatch(/Skipped "Weekly".*organised by other@x.com/)
  })
})
