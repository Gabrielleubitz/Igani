/**
 * End-to-end booking flow against a disposable Postgres (TEST_DATABASE_URL) with Google
 * Calendar and Resend mocked at the module boundary.
 */
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
Object.assign(process.env, {
  NEXTAUTH_SECRET: 'test-secret-test-secret-test-secret',
  GOOGLE_CLIENT_ID: 'id',
  GOOGLE_CLIENT_SECRET: 'secret',
  RESEND_API_KEY: 're_test',
  EMAIL_FROM: 'Igani <bookings@igani.co>',
  LEAD_WEBHOOK_SECRET: 'webhook-secret-webhook-secret',
  NEXT_PUBLIC_APP_URL: 'https://app.igani.co',
})

const insert = vi.fn()
const del = vi.fn(async () => ({}))
const busy: { start: string; end: string }[] = []
const busyByHost = new Map<string, { start: string; end: string }[]>()
vi.mock('@/lib/google', () => ({
  GoogleNotConnectedError: class extends Error {},
  calendarForHost: async (hostId: string) => ({
    freebusy: { query: async () => ({ data: { calendars: { primary: { busy: busyByHost.get(hostId) ?? busy } } } }) },
    events: { insert, delete: del },
  }),
}))
const sentConfirmations: unknown[] = []
const sentTeammate: unknown[] = []
vi.mock('@/lib/email', () => ({
  sendBookingConfirmedEmail: async (b: unknown) => {
    sentConfirmations.push(b)
    return 'email_1'
  },
  sendApprovalRequestEmail: async () => 'email_2',
  sendBookingCancelledEmail: async () => 'email_cancel',
  sendBookingInviteEmail: async () => 'email_3',
  sendTeammateMeetingEmail: async (b: unknown) => {
    sentTeammate.push(b)
    return 'email_4'
  },
}))

const d = testDb ? describe : describe.skip

d('booking confirmation flow', async () => {
  const { cancelUpcomingMeetingsOfHost, cancelBooking, createPendingBooking, confirmBooking, assertSlotOffered, allowedTeammates, findTimeConflict, findParticipantConflicts, teamMeetingIds, bookingScope, doneBookingIds, deleteBooking, BookingError } = await import('@/lib/bookings')
  const { getAvailableSlots } = await import('@/lib/calendar')
  const { syncCalendarChanges } = await import('@/lib/calendar-sync')
  const prisma = new PrismaClient()
  let hostId = ''

  beforeEach(async () => {
    await prisma.siteSetting.deleteMany()
    await prisma.activityLog.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.availability.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    insert.mockReset()
    del.mockClear()
    busy.length = 0
    sentConfirmations.length = 0
    sentTeammate.length = 0
    const host = await prisma.user.create({ data: { email: 'host@igani.co', name: 'Host', role: 'SALES', timeZone: 'Asia/Jerusalem' } })
    hostId = host.id
  })
  afterAll(async () => prisma.$disconnect())

  it('is open around the clock, minus Google busy time and held bookings', async () => {
    busy.push({ start: '2030-01-07T07:30:00Z', end: '2030-01-07T08:00:00Z' })
    const slots = await getAvailableSlots(hostId, new Date('2030-01-07'), 30)
    // Jerusalem is UTC+2 in January: the whole local day, 00:00-24:00, in half-hour steps (48), minus the busy slot.
    expect(slots).toHaveLength(47)
    expect(slots).toContain('2030-01-06T22:00:00.000Z') // local midnight
    expect(slots).toContain('2030-01-07T21:30:00.000Z') // local 23:30
    expect(slots).not.toContain('2030-01-07T07:30:00.000Z')
    await createPendingBooking({ hostId, source: 'SALES_INVITE', start: new Date('2030-01-07T08:00:00Z'), durationMinutes: 30, title: 'Intro', guestName: 'G', guestEmail: 'g@example.com' })
    const after = await getAvailableSlots(hostId, new Date('2030-01-07'), 30)
    expect(after).toHaveLength(46)
    expect(after).not.toContain('2030-01-07T08:00:00.000Z')
    // No weekend or hours rules any more: a Tuesday is as open as a Monday.
    expect(await getAvailableSlots(hostId, new Date('2030-01-08'), 30)).toHaveLength(48)
    await expect(assertSlotOffered(hostId, new Date('2030-01-07T07:30:00Z'), 30)).rejects.toBeInstanceOf(BookingError)
  })

  it('confirms with a Meet event, stores meetUrl, advances the lead and emails once', async () => {
    insert.mockResolvedValue({ data: { id: 'evt_1', hangoutLink: 'https://meet.google.com/abc-defg-hij', htmlLink: null } })
    const booking = await createPendingBooking({
      hostId, source: 'SALES_INVITE', start: new Date('2030-01-07T07:00:00Z'), durationMinutes: 30, title: 'Intro', guestName: 'Dana Cohen', guestEmail: 'dana@example.com',
    })
    const [a, b] = await Promise.all([confirmBooking(booking.id, null), confirmBooking(booking.id, null)])
    expect(insert).toHaveBeenCalledTimes(1)
    expect(insert.mock.calls[0]![0]).toMatchObject({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: { conferenceData: { createRequest: { conferenceSolutionKey: { type: 'hangoutsMeet' } } } },
    })
    const stored = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id }, include: { lead: true } })
    expect(stored).toMatchObject({ status: 'CONFIRMED', meetUrl: 'https://meet.google.com/abc-defg-hij', googleEventId: 'evt_1' })
    expect(stored.lead).toMatchObject({ status: 'DEMO_SCHEDULED', firstName: 'Dana', lastName: 'Cohen' })
    expect([a.status, b.status]).toEqual(['CONFIRMED', 'CONFIRMED'])
    expect(sentConfirmations).toHaveLength(1)
  })

  it('Google Calendar -> CRM: an event cancelled or moved in Google updates the booking and the dashboard count', async () => {
    const today = () => prisma.booking.count({ where: { status: 'CONFIRMED', source: { not: 'TEAM_MEETING' }, endTime: { gte: new Date('2030-01-07T00:00:00Z') }, startTime: { lt: new Date('2030-01-08T00:00:00Z') } } })
    const book = async (n: number, id: string) => {
      insert.mockResolvedValueOnce({ data: { id, hangoutLink: `https://meet.google.com/aaa-bbbb-cc${n}`, htmlLink: null } })
      const b = await createPendingBooking({ hostId, source: 'SALES_INVITE', start: new Date(`2030-01-07T0${n}:00:00Z`), durationMinutes: 30, title: `M${n}`, guestName: 'G', guestEmail: `g${n}@example.com`, noLead: true })
      await confirmBooking(b.id, null)
      return b.id
    }
    const a = await book(1, 'evt_a')
    const m = await book(3, 'evt_m')
    expect(await today()).toBe(2) // booked from the CRM
    const now = new Date('2030-01-06T00:00:00Z')
    const same = { gone: false as const, start: new Date('2030-01-07T01:00:00Z'), end: new Date('2030-01-07T01:30:00Z') }
    const lookup = async (_h: string, ev: string) => (ev === 'evt_a' ? { gone: true as const } : ev === 'evt_m' ? { gone: false as const, start: new Date('2030-01-09T03:00:00Z'), end: new Date('2030-01-09T03:30:00Z') } : same)
    const r = await syncCalendarChanges({ now, lookup })
    expect(r).toMatchObject({ checked: 2, cancelled: 1, moved: 1, failed: 0 })
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: a } })).status).toBe('CANCELLED')
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: m } })).startTime.toISOString()).toBe('2030-01-09T03:00:00.000Z')
    expect(await today()).toBe(0) // cancelled + moved away in Google -> counter dropped
    expect(del).not.toHaveBeenCalled() // already gone in Google: no second delete
    expect(await syncCalendarChanges({ now, lookup })).toMatchObject({ checked: 1, cancelled: 0, moved: 0 }) // idempotent
  })

  it('lets any future time be chosen by hand, and notes a clash with another call', async () => {
    expect(await findTimeConflict(hostId, new Date('2030-01-07T03:17:00Z'), 30)).toBeNull() // odd minute, middle of the night
    expect(await findTimeConflict(hostId, new Date('2020-01-01T10:00:00Z'), 30)).toMatch(/passed/)
    await createPendingBooking({ hostId, source: 'SALES_INVITE', start: new Date('2030-01-07T08:00:00Z'), durationMinutes: 30, title: 'Intro', guestName: 'Dana', guestEmail: 'dana@example.com' })
    expect(await findTimeConflict(hostId, new Date('2030-01-07T08:10:00Z'), 30)).toMatch(/already booked.*Intro with Dana/)
    busy.push({ start: '2030-01-07T12:00:00Z', end: '2030-01-07T13:00:00Z' })
    expect(await findTimeConflict(hostId, new Date('2030-01-07T12:15:00Z'), 30)).toMatch(/busy on the Google Calendar/)
  })

  it('team meetings: no lead, no client email, every teammate emailed, visible only to host, attendees and admins', async () => {
    const ada = await prisma.user.create({ data: { email: 'ada@igani.co', name: 'Ada', role: 'ADMIN' } })
    const other = await prisma.user.create({ data: { email: 'other@igani.co', name: 'Other', role: 'SALES' } })
    insert.mockResolvedValue({ data: { id: 'evt_t', hangoutLink: 'https://meet.google.com/aaa-bbbb-ccc', htmlLink: null } })
    const booking = await createPendingBooking({ hostId, source: 'SALES_INVITE', start: new Date('2030-01-07T07:00:00Z'), durationMinutes: 30, title: 'Sync', guestName: 'Ada', guestEmail: 'ada@igani.co', noLead: true })
    await prisma.activityLog.create({ data: { entityType: 'BOOKING', entityId: booking.id, action: 'booking.team_meeting' } })
    await prisma.activityLog.create({ data: { entityType: 'BOOKING', entityId: booking.id, action: 'booking.teammates', metadata: { userIds: [ada.id] } } })
    await confirmBooking(booking.id, hostId)
    expect(await prisma.lead.count()).toBe(0)
    expect(booking.leadId).toBeNull()
    expect(sentConfirmations).toHaveLength(0) // no client confirmation
    expect(sentTeammate).toHaveLength(1)
    expect(sentTeammate[0]).toMatchObject({ teammateEmail: 'ada@igani.co', guestName: 'the team' })
    expect((await teamMeetingIds([booking.id])).has(booking.id)).toBe(true)
    const ids = async (u: { id: string; role: 'ADMIN' | 'SALES' }) => (await prisma.booking.findMany({ where: await bookingScope(u) })).map((b) => b.id)
    expect(await ids({ id: hostId, role: 'SALES' })).toEqual([booking.id])
    expect(await ids({ id: ada.id, role: 'ADMIN' })).toEqual([booking.id])
    expect(await ids({ id: other.id, role: 'SALES' })).toEqual([])
  })

  it('names each added teammate who is not free', async () => {
    const a = await prisma.user.create({ data: { email: 'a@igani.co', name: 'Avi', role: 'SALES' } })
    const b = await prisma.user.create({ data: { email: 'b@igani.co', name: 'Bea', role: 'SALES' } })
    const start = new Date('2030-01-07T08:00:00Z')
    expect(await findParticipantConflicts([a.id, b.id], start, 30)).toBeNull()
    await createPendingBooking({ hostId: a.id, source: 'SALES_INVITE', start, durationMinutes: 30, title: 'X', guestName: 'G', guestEmail: 'g@example.com' })
    expect(await findParticipantConflicts([a.id, b.id], start, 30)).toBe('Avi is not free at this time.')
    await createPendingBooking({ hostId: b.id, source: 'SALES_INVITE', start, durationMinutes: 30, title: 'Y', guestName: 'H', guestEmail: 'h@example.com' })
    expect(await findParticipantConflicts([a.id, b.id], start, 30)).toBe('Avi and Bea are not free at this time.')
  })

  it('reports a participant who has a 5 PM Google event or is already in another meeting at 5 PM', async () => {
    const host = await prisma.user.create({ data: { email: 'h5@igani.co', name: 'Hana', role: 'SALES' } })
    const g = await prisma.user.create({ data: { email: 'g5@igani.co', name: 'Gil', role: 'SALES' } })
    const m = await prisma.user.create({ data: { email: 'm5@igani.co', name: 'Maya', role: 'SALES' } })
    const start = new Date('2030-01-08T17:00:00Z')
    busyByHost.set(g.id, [{ start: '2030-01-08T17:00:00Z', end: '2030-01-08T17:30:00Z' }])
    busyByHost.set(host.id, [])
    busyByHost.set(m.id, [])
    try {
      expect(await findParticipantConflicts([host.id, g.id, m.id], start, 30)).toBe('Gil is not free at this time.')
      busyByHost.set(g.id, [])
      const other = await createPendingBooking({ hostId: host.id, source: 'SALES_INVITE', start: new Date('2030-01-08T16:45:00Z'), durationMinutes: 30, title: 'Z', guestName: 'K', guestEmail: 'k@example.com' })
      await prisma.activityLog.create({ data: { entityType: 'BOOKING', entityId: other.id, action: 'booking.teammates', metadata: { userIds: [m.id] } } })
      expect(await findParticipantConflicts([g.id, m.id], start, 30)).toBe('Maya is not free at this time.')
    } finally {
      busyByHost.clear()
    }
  })

  it('marks a meeting done (and undone), and deletes one for good', async () => {
    insert.mockResolvedValue({ data: { id: 'evt_d', hangoutLink: 'https://meet.google.com/ddd-eeee-fff', htmlLink: null } })
    const b = await createPendingBooking({ hostId, source: 'SALES_INVITE', start: new Date('2030-01-07T07:00:00Z'), durationMinutes: 30, title: 'Intro', guestName: 'Dana', guestEmail: 'dana@example.com' })
    await confirmBooking(b.id, hostId)
    await prisma.activityLog.create({ data: { entityType: 'BOOKING', entityId: b.id, action: 'booking.done' } })
    expect((await doneBookingIds()).has(b.id)).toBe(true)
    await prisma.activityLog.create({ data: { entityType: 'BOOKING', entityId: b.id, action: 'booking.undone' } })
    expect((await doneBookingIds()).has(b.id)).toBe(false)
    await deleteBooking(b.id, hostId)
    expect(await prisma.booking.findUnique({ where: { id: b.id } })).toBeNull()
    expect(await prisma.activityLog.count({ where: { entityId: b.id, action: 'booking.deleted' } })).toBe(1)
    // the time is free again
    expect(await findTimeConflict(hostId, new Date('2030-01-07T07:00:00Z'), 30)).toBeNull()
  })

  it('cancelling an upcoming meeting removes it from everyone invited; a finished one is removed quietly', async () => {
    insert.mockResolvedValue({ data: { id: 'evt_c', hangoutLink: 'https://meet.google.com/ccc-dddd-eee', htmlLink: null } })
    const b = await createPendingBooking({ hostId, source: 'SALES_INVITE', start: new Date('2030-01-07T07:00:00Z'), durationMinutes: 30, title: 'Intro', guestName: 'Dana', guestEmail: 'dana@example.com' })
    await confirmBooking(b.id, hostId)
    await cancelBooking(b.id, hostId, 'test', false)
    expect(del).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'evt_c', sendUpdates: 'all' }))

    const past = await prisma.booking.create({ data: { status: 'CONFIRMED', source: 'SALES_INVITE', startTime: new Date('2020-01-07T07:00:00Z'), endTime: new Date('2020-01-07T07:30:00Z'), title: 'Old', guestName: 'G', guestEmail: 'g@example.com', hostId, googleEventId: 'evt_old' } })
    del.mockClear()
    await cancelBooking(past.id, hostId, 'test', false)
    expect(del).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'evt_old', sendUpdates: 'none' }))
  })

  it('deactivating a host cancels their upcoming meetings (and removes the calendar event)', async () => {
    insert.mockResolvedValue({ data: { id: 'evt_h', hangoutLink: 'https://meet.google.com/hhh-iiii-jjj', htmlLink: null } })
    const b = await createPendingBooking({ hostId, source: 'SALES_INVITE', start: new Date('2030-01-07T07:00:00Z'), durationMinutes: 30, title: 'Intro', guestName: 'Dana', guestEmail: 'dana@example.com' })
    await confirmBooking(b.id, hostId)
    const admin = await prisma.user.create({ data: { email: 'adm@igani.co', role: 'ADMIN' } })
    expect(await cancelUpcomingMeetingsOfHost(hostId, admin.id)).toBe(1)
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe('CANCELLED')
    expect(del).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'evt_h', sendUpdates: 'all' }))
    expect(await cancelUpcomingMeetingsOfHost(hostId, admin.id)).toBe(0) // nothing left to cancel
  })

  it('lets admins add anyone, and everyone else only admins', async () => {
    const admin = await prisma.user.create({ data: { email: 'admin@igani.co', name: 'Ada', role: 'ADMIN' } })
    const rep = await prisma.user.create({ data: { email: 'rep@igani.co', name: 'Rex', role: 'SALES' } })
    await prisma.user.create({ data: { email: 'gone@igani.co', name: 'Gone', role: null } })
    const forAdmin = (await allowedTeammates({ id: admin.id, role: 'ADMIN' }, hostId)).map((t) => t.email)
    expect(forAdmin).toEqual(['rep@igani.co'])
    const forRep = (await allowedTeammates({ id: rep.id, role: 'SALES' }, hostId)).map((t) => t.email)
    expect(forRep).toEqual(['admin@igani.co'])
  })

  it('adds saved teammates to the Meet and emails them the link once confirmed', async () => {
    const admin = await prisma.user.create({ data: { email: 'admin@igani.co', name: 'Ada', role: 'ADMIN' } })
    insert.mockResolvedValue({ data: { id: 'evt_2', hangoutLink: 'https://meet.google.com/abc-defg-hij', htmlLink: null } })
    const booking = await createPendingBooking({ hostId, source: 'SALES_INVITE', start: new Date('2030-01-07T07:00:00Z'), durationMinutes: 30, title: 'Intro', guestName: 'Dana', guestEmail: 'dana@example.com' })
    await prisma.activityLog.create({ data: { entityType: 'BOOKING', entityId: booking.id, action: 'booking.teammates', metadata: { userIds: [admin.id] } } })
    await confirmBooking(booking.id, null)
    const attendees = (insert.mock.calls[0]?.[0] as { requestBody: { attendees: { email: string }[] } }).requestBody.attendees.map((a) => a.email)
    expect(attendees).toEqual(['dana@example.com', 'admin@igani.co'])
    expect(sentTeammate).toHaveLength(1)
    expect(sentTeammate[0]).toMatchObject({ teammateEmail: 'admin@igani.co', meetUrl: 'https://meet.google.com/abc-defg-hij' })
  })

  it('rolls back to PENDING when Google fails, and refuses taken slots', async () => {
    insert.mockRejectedValue(new Error('quota'))
    const booking = await createPendingBooking({
      hostId, source: 'PUBLIC_PAGE', start: new Date('2030-01-07T07:00:00Z'), durationMinutes: 30, title: 'Intro', guestName: 'G', guestEmail: 'g@example.com',
    })
    await expect(confirmBooking(booking.id, null)).rejects.toMatchObject({ code: 'CALENDAR' })
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe('PENDING')

    busy.push({ start: '2030-01-07T07:00:00Z', end: '2030-01-07T07:15:00Z' })
    await expect(confirmBooking(booking.id, null)).rejects.toMatchObject({ code: 'SLOT_TAKEN' })
  })
})
