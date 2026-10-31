/** Regression tests for bugs found in the CRM review. DB tests need TEST_DATABASE_URL (they wipe tables). */
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
const cancellations: unknown[] = []
vi.mock('@/lib/email', () => ({
  sendBookingCancelledEmail: async (b: unknown) => {
    cancellations.push(b)
    return 'email_c'
  },
  sendLeadAssignedEmail: async () => 'x',
  sendNewLeadAlertEmail: async () => 'x',
}))
vi.mock('@/lib/google', () => ({ GoogleNotConnectedError: class extends Error {}, calendarForHost: async () => ({ events: { delete: async () => ({}) } }) }))

const d = testDb ? describe : describe.skip

d('review regressions', async () => {
  const { ingestLead, leadPayloadSchema, assignLeadManually } = await import('@/lib/leads')
  const { cancelBooking } = await import('@/lib/bookings')
  const { tasksForUser, createAutoTask } = await import('@/lib/tasks')
  const prisma = new PrismaClient()
  beforeEach(async () => {
    cancellations.length = 0
    await prisma.activityLog.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    await prisma.allowedUser.deleteMany()
    await prisma.siteSetting.deleteMany()
  })
  afterAll(async () => prisma.$disconnect())

  const rep = async (email: string) => {
    await prisma.allowedUser.create({ data: { email, role: 'SALES' } })
    return prisma.user.create({ data: { email, name: email, role: 'SALES', timeZone: 'UTC' } })
  }

  it('keeps a lead whose email is a typo but whose phone is valid', async () => {
    const p = leadPayloadSchema.parse({ email: 'dana@gmail.com.', phone: '050-1112233' })
    expect(p.email).toBe('dana@gmail.com')
    const q = leadPayloadSchema.parse({ email: 'first..last@x.com', phone: '050-1112233' })
    expect(q.email).toBeUndefined()
    expect(leadPayloadSchema.safeParse({ email: 'nope' }).success).toBe(false)
  })

  it('brings an archived contact back when they reach out again (but not on backfill)', async () => {
    const { leadId } = await ingestLead(leadPayloadSchema.parse({ email: 'back@x.com', message: 'first' }))
    await prisma.lead.update({ where: { id: leadId }, data: { archived: true } })
    await ingestLead(leadPayloadSchema.parse({ email: 'back@x.com', message: 'old', backfill: true }))
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: leadId } })).archived).toBe(true)
    await ingestLead(leadPayloadSchema.parse({ email: 'back@x.com', message: 'hello again' }))
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } })
    expect(lead.archived).toBe(false)
    expect(lead.message).toContain('hello again')
  })

  it('backfill keeps a second, different message once (re-running adds nothing)', async () => {
    const a = leadPayloadSchema.parse({ email: 'two@x.com', message: 'from contact page', backfill: true, submittedAt: '2025-01-01T00:00:00.000Z' })
    const b = leadPayloadSchema.parse({ email: 'two@x.com', message: 'from landing page', backfill: true, submittedAt: '2025-02-01T00:00:00.000Z', sourceDetail: '/funnels' })
    await ingestLead(a)
    await ingestLead(b)
    await ingestLead(b)
    const lead = await prisma.lead.findUniqueOrThrow({ where: { email: 'two@x.com' } })
    expect(lead.message!.match(/from landing page/g)).toHaveLength(1)
    expect(lead.message).toContain('also submitted 2025-02-01 via /funnels')
  })

  it('a claim only succeeds while the contact is unassigned', async () => {
    const a = await rep('a@igani.co')
    const b = await rep('b@igani.co')
    const { leadId } = await ingestLead(leadPayloadSchema.parse({ email: 'claim@x.com' }))
    const results = await Promise.allSettled([assignLeadManually(leadId, a.id, a.id, { onlyIfUnassigned: true }), assignLeadManually(leadId, b.id, b.id, { onlyIfUnassigned: true })])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
  })

  it('cancelling twice emails the guest once and removes the prep task', async () => {
    const host = await rep('host@igani.co')
    const { leadId } = await ingestLead(leadPayloadSchema.parse({ email: 'guest@x.com' }))
    const start = new Date(Date.now() + 2 * 864e5)
    const booking = await prisma.booking.create({ data: { status: 'CONFIRMED', source: 'SALES_INVITE', startTime: start, endTime: new Date(start.getTime() + 18e5), title: 'Intro', guestName: 'G', guestEmail: 'guest@x.com', hostId: host.id, leadId } })
    await createAutoTask({ leadId, title: 'Prep for call: Intro', dueAt: start, assigneeId: host.id, auto: 'prep', bookingId: booking.id })
    await Promise.all([cancelBooking(booking.id, host.id, 'test', 'cancelled'), cancelBooking(booking.id, host.id, 'test', 'cancelled')])
    expect(cancellations).toHaveLength(1)
    expect((cancellations[0] as { removeFromCalendar?: boolean }).removeFromCalendar).toBe(true)
    expect(await prisma.activityLog.count({ where: { entityId: booking.id, action: 'booking.cancelled' } })).toBe(1)
    const { all } = await tasksForUser({ id: host.id, role: 'ADMIN' })
    expect(all.filter((t) => !t.done)).toHaveLength(0)
  })

  it('ignores tasks on archived or deleted contacts, and counts unassigned tasks only for the owner', async () => {
    const a = await rep('a@igani.co')
    const b = await rep('b@igani.co')
    const mk = async (email: string, owner: string | null) => (await prisma.lead.create({ data: { email, assignedToId: owner } })).id
    const owned = await mk('o@x.com', a.id)
    const archived = await mk('arch@x.com', a.id)
    const deleted = await mk('del@x.com', a.id)
    const others = await mk('b@x.com', b.id)
    for (const leadId of [owned, archived, deleted, others]) {
      await prisma.activityLog.create({ data: { entityType: 'LEAD', entityId: leadId, action: 'task.created', metadata: { taskId: crypto.randomUUID(), title: 't', dueAt: new Date().toISOString(), assigneeId: null, priority: 'MEDIUM' } } })
    }
    await prisma.lead.update({ where: { id: archived }, data: { archived: true } })
    await prisma.lead.delete({ where: { id: deleted } })
    const forA = await tasksForUser({ id: a.id, role: 'SALES' })
    expect(forA.mine.map((t) => t.leadId)).toEqual([owned])
    const admin = await tasksForUser({ id: 'admin-x', role: 'ADMIN' })
    expect(admin.mine).toHaveLength(0) // unassigned tasks on other people's contacts are not the admin's
    expect(admin.all.map((t) => t.leadId).sort()).toEqual([owned, others].sort())
  })
})
