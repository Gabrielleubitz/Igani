/**
 * Integration tests against a real, disposable Postgres. They WIPE the tables, so they only
 * run when TEST_DATABASE_URL is set (never DATABASE_URL), e.g.
 *   TEST_DATABASE_URL=postgresql://localhost:5432/igani_crm_test npm test
 */
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
const hasDb = Boolean(testDb)
const d = hasDb ? describe : describe.skip

d('lead ingest + round-robin + booking holds', async () => {
  const { ingestLead, assignLeadRoundRobin, leadPayloadSchema } = await import('@/lib/leads')
  const { createPendingBooking, BookingError } = await import('@/lib/bookings')
  const prisma = new PrismaClient()

  beforeEach(async () => {
    await prisma.activityLog.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    await prisma.allowedUser.deleteMany()
  })
  afterAll(async () => prisma.$disconnect())

  async function rep(email: string, active = true) {
    await prisma.allowedUser.create({ data: { email, role: 'SALES', active } })
    return prisma.user.create({ data: { email, name: email, role: 'SALES' } })
  }

  it('dedupes by email, fills blanks, and logs both events', async () => {
    const first = await ingestLead(leadPayloadSchema.parse({ email: 'Dana@Example.com', firstName: 'Dana', utm: { source: 'google' } }))
    const second = await ingestLead(leadPayloadSchema.parse({ email: 'dana@example.com', company: 'Acme', firstName: 'Other' }))
    expect(first.created).toBe(true)
    expect(second).toMatchObject({ leadId: first.leadId, created: false, needsAssignment: true })
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: first.leadId } })
    expect(lead).toMatchObject({ email: 'dana@example.com', firstName: 'Dana', company: 'Acme', utmSource: 'google' })
    const actions = (await prisma.activityLog.findMany({ where: { entityId: first.leadId }, orderBy: { createdAt: 'asc' } })).map((l) => l.action)
    expect(actions).toEqual(['lead.created', 'lead.resubmitted'])
  })

  it('handles concurrent duplicate submissions', async () => {
    const results = await Promise.all([1, 2, 3].map(() => ingestLead(leadPayloadSchema.parse({ email: 'race@example.com' }))))
    expect(new Set(results.map((r) => r.leadId)).size).toBe(1)
    expect(await prisma.lead.count()).toBe(1)
  })

  it('rotates across active SALES reps only, evenly under concurrency', async () => {
    const a = await rep('a@igani.co')
    const b = await rep('b@igani.co')
    await rep('off@igani.co', false)
    const ids = await Promise.all(
      Array.from({ length: 6 }, (_, i) => ingestLead(leadPayloadSchema.parse({ email: `l${i}@example.com` })).then((r) => r.leadId)),
    )
    const assigned = await Promise.all(ids.map((id) => assignLeadRoundRobin(id)))
    const counts = assigned.reduce<Record<string, number>>((acc, id) => ({ ...acc, [id ?? 'none']: (acc[id ?? 'none'] ?? 0) + 1 }), {})
    expect(counts).toEqual({ [a.id]: 3, [b.id]: 3 })
    expect(await assignLeadRoundRobin(ids[0]!)).toBeNull() // already assigned
  })

  it('logs a skip when there are no reps', async () => {
    const { leadId } = await ingestLead(leadPayloadSchema.parse({ email: 'x@example.com' }))
    expect(await assignLeadRoundRobin(leadId)).toBeNull()
    expect(await prisma.activityLog.count({ where: { entityId: leadId, action: 'lead.assignment_skipped' } })).toBe(1)
  })

  it('never lets two bookings hold overlapping time for one host', async () => {
    const host = await rep('host@igani.co')
    const base = { hostId: host.id, source: 'PUBLIC_PAGE' as const, durationMinutes: 30, title: 'Intro', guestName: 'G' }
    const results = await Promise.allSettled([
      createPendingBooking({ ...base, start: new Date('2030-01-07T09:00:00Z'), guestEmail: 'g1@example.com' }),
      createPendingBooking({ ...base, start: new Date('2030-01-07T09:15:00Z'), guestEmail: 'g2@example.com' }),
    ])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult
    expect(rejected.reason).toBeInstanceOf(BookingError)
    // Back-to-back is fine, and the guest became a lead assigned to the host
    await createPendingBooking({ ...base, start: new Date('2030-01-07T09:45:00Z'), guestEmail: 'g3@example.com' })
    expect(await prisma.lead.findUnique({ where: { email: 'g3@example.com' } })).toMatchObject({ assignedToId: host.id, source: 'booking-page' })
  })
})
