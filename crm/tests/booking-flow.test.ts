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
const busy: { start: string; end: string }[] = []
vi.mock('@/lib/google', () => ({
  GoogleNotConnectedError: class extends Error {},
  calendarForHost: async () => ({
    freebusy: { query: async () => ({ data: { calendars: { primary: { busy } } } }) },
    events: { insert, delete: vi.fn(async () => ({})) },
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
  sendBookingInviteEmail: async () => 'email_3',
  sendTeammateMeetingEmail: async (b: unknown) => {
    sentTeammate.push(b)
    return 'email_4'
  },
}))

const d = testDb ? describe : describe.skip

d('booking confirmation flow', async () => {
  const { createPendingBooking, confirmBooking, assertSlotOffered, allowedTeammates, BookingError } = await import('@/lib/bookings')
  const { getAvailableSlots } = await import('@/lib/calendar')
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
