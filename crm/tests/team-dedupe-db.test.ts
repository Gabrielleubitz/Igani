/** Duplicate team-meeting summaries against a real DB (needs TEST_DATABASE_URL): seeded duplicates show once; re-import never double-books. */
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
const d = testDb ? describe : describe.skip

vi.mock('@/lib/audit', () => ({ logActivity: async () => undefined }))
vi.mock('@/lib/meetings', () => ({ googleMeetingApi: async () => ({ can: { meet: false } }), syncMeeting: async () => ({ notesStatus: 'READY' }) }))
const ev = { id: 'evt1', summary: 'Standup', status: 'confirmed', hangoutLink: 'https://meet.google.com/abc-defg-hij', start: { dateTime: '2026-10-30T10:00:00Z' }, end: { dateTime: '2026-10-30T10:30:00Z' }, organizer: { email: 'a@igani.co' }, attendees: [{ email: 'a@igani.co' }, { email: 'b@igani.co' }] }
vi.mock('@/lib/calendar', () => ({ createMeetEvent: async () => ({}), listMeetEvents: async () => [ev] }))

d('duplicate team meeting summaries', async () => {
  const prisma = new PrismaClient()
  const { dedupeCalls } = await import('@/lib/meet-notes')
  const { importTeamMeetings } = await import('@/lib/team-meetings')
  beforeEach(async () => {
    await prisma.meetingSession.deleteMany()
    await prisma.activityLog.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.user.deleteMany()
  })
  afterAll(async () => prisma.$disconnect())

  it('two bookings sharing a Meet room show as one call with one summary (same query as the panel)', async () => {
    const a = await prisma.user.create({ data: { email: 'a@igani.co', role: 'ADMIN' } })
    const b = await prisma.user.create({ data: { email: 'b@igani.co', role: 'ADMIN' } })
    const base = { status: 'CONFIRMED' as const, source: 'TEAM_MEETING' as const, meetUrl: 'https://meet.google.com/abc-defg-hij', startTime: new Date('2026-10-30T10:00:00Z'), endTime: new Date('2026-10-30T10:30:00Z'), guestName: 'Team', guestEmail: 'a@igani.co', createdById: a.id }
    const b1 = await prisma.booking.create({ data: { ...base, hostId: a.id, title: 'Standup' } })
    const b2 = await prisma.booking.create({ data: { ...base, hostId: b.id, title: 'Standup' } })
    for (const [bk, doc] of [[b1, 'D1'], [b2, 'D1']] as const) await prisma.meetingSession.create({ data: { bookingId: bk.id, meetingCode: 'abc-defg-hij', notesStatus: 'READY', docId: doc, summaryText: 'Same summary' } })
    const rows = await prisma.booking.findMany({ where: { source: 'TEAM_MEETING', status: { not: 'CANCELLED' } }, orderBy: { startTime: 'desc' }, include: { meeting: true } })
    expect(rows).toHaveLength(2)
    const shown = dedupeCalls(rows)
    expect(shown).toHaveLength(1)
    expect(shown[0]!.meeting!.summaryText).toBe('Same summary')
    expect(await prisma.booking.count()).toBe(2) // hidden, not deleted
  })

  it('importing twice (even as another admin) never makes a second booking for the same event', async () => {
    const a = await prisma.user.create({ data: { email: 'a@igani.co', role: 'ADMIN' } })
    const b = await prisma.user.create({ data: { email: 'b@igani.co', role: 'ADMIN' } })
    const now = new Date('2026-11-01T09:00:00Z')
    expect((await importTeamMeetings(a.id, { now })).imported).toBe(1)
    expect((await importTeamMeetings(a.id, { now })).imported).toBe(0)
    expect((await importTeamMeetings(b.id, { now })).imported).toBe(0)
    expect(await prisma.booking.count({ where: { googleEventId: 'evt1' } })).toBe(1)
  })
})
