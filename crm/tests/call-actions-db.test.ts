import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
Object.assign(process.env, { NEXTAUTH_SECRET: 'test-secret-test-secret-test-secret', NEXT_PUBLIC_APP_URL: 'https://app.igani.co' })

const session = { user: null as null | { id: string; email: string; role: 'ADMIN' | 'SALES'; name: string | null } }
vi.mock('@/lib/auth', async (orig) => ({ ...(await orig<typeof import('@/lib/auth')>()), requireUser: async () => session.user, currentUserOrNull: async () => session.user }))

// Google is never reached: my free slots are given; teammates' calendars come from this map (missing = not connected)
const DAY = '2026-11-20'
const at = (hm: string): string => new Date(`${DAY}T${hm}:00+02:00`).toISOString()
const googleBusy = new Map<string, { start: Date; end: Date }[]>()
vi.mock('@/lib/calendar', async (orig) => ({
  ...(await orig<typeof import('@/lib/calendar')>()),
  getAvailableSlots: async () => [at('06:00'), at('09:00'), at('10:00'), at('11:00'), at('14:00'), at('23:00')],
  getGoogleBusy: async (userId: string) => {
    const b = googleBusy.get(userId)
    if (!b) throw new Error('Google not connected')
    return b
  },
}))

const d = testDb ? describe : describe.skip

d('in-call booking: times when everyone is free', async () => {
  const { freeTimesWithTeam, callBookingInfo } = await import('@/app/actions/call-actions')
  const prisma = new PrismaClient()
  let me = ''
  let dana = ''
  let omer = ''
  let leadId = ''

  beforeEach(async () => {
    googleBusy.clear()
    await prisma.booking.deleteMany()
    await prisma.activityLog.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    await prisma.siteSetting.deleteMany()
    me = (await prisma.user.create({ data: { email: 'boss@igani.co', name: 'Gabriel', role: 'ADMIN', timeZone: 'Asia/Jerusalem' } })).id
    dana = (await prisma.user.create({ data: { email: 'dana@igani.co', name: 'Dana', role: 'ADMIN', timeZone: 'Asia/Jerusalem' } })).id
    omer = (await prisma.user.create({ data: { email: 'omer@igani.co', name: 'Omer', role: 'SALES', timeZone: 'Asia/Jerusalem' } })).id
    leadId = (await prisma.lead.create({ data: { email: 'client@x.com', firstName: 'Noa', assignedToId: me } })).id
    session.user = { id: me, email: 'boss@igani.co', role: 'ADMIN', name: 'Gabriel' }
  })
  afterAll(async () => {
    await prisma.booking.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  it('alone: my free times between 07:00 and 22:00', async () => {
    const r = await freeTimesWithTeam({ date: DAY, durationMinutes: 30, teammateIds: [] })
    expect(r.ok && r.data.slots).toEqual([at('09:00'), at('10:00'), at('11:00'), at('14:00')])
  })

  it('with teammates: drops times they have a meeting or a Google event, and flags an unreadable calendar', async () => {
    googleBusy.set(dana, [{ start: new Date(at('10:00')), end: new Date(at('10:30')) }])
    // Omer has no Google connected, but hosts a meeting at 14:00 in the CRM
    await prisma.booking.create({ data: { hostId: omer, title: 'x', guestName: 'g', guestEmail: 'g@x.com', startTime: new Date(at('14:00')), endTime: new Date(at('14:30')), status: 'CONFIRMED', source: 'SALES_INVITE' } })
    const r = await freeTimesWithTeam({ date: DAY, durationMinutes: 30, teammateIds: [dana, omer] })
    if (!r.ok) throw new Error(r.error)
    expect(r.data.slots).toEqual([at('09:00'), at('11:00')])
    expect(r.data.unchecked).toEqual(['Omer'])
  })

  it('counts a meeting a teammate was added to, not only ones they host', async () => {
    googleBusy.set(dana, [])
    const b = await prisma.booking.create({ data: { hostId: me, title: 'x', guestName: 'g', guestEmail: 'g@x.com', startTime: new Date(at('11:00')), endTime: new Date(at('11:30')), status: 'PENDING', source: 'SALES_INVITE' } })
    await prisma.activityLog.create({ data: { entityType: 'BOOKING', entityId: b.id, action: 'booking.teammates', metadata: { userIds: [dana] } } })
    const r = await freeTimesWithTeam({ date: DAY, durationMinutes: 30, teammateIds: [dana] })
    expect(r.ok && r.data.slots).toEqual([at('09:00'), at('10:00'), at('14:00')])
  })

  it('gives the client’s email and who can join', async () => {
    const r = await callBookingInfo(leadId)
    if (!r.ok) throw new Error(r.error)
    expect(r.data).toMatchObject({ email: 'client@x.com', guestName: 'Noa', timeZone: 'Asia/Jerusalem' })
    expect(r.data.teammates.map((t) => t.name).sort()).toEqual(['Dana', 'Omer'])
  })
})
