/** Lead sources, phone-only leads and quiet backfills. DB tests run only with TEST_DATABASE_URL (they wipe tables). */
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
const d = testDb ? describe : describe.skip

describe('lead payload schema', async () => {
  const { leadPayloadSchema } = await import('@/lib/leads')
  it('needs an email or a phone, and keeps the source detail', () => {
    expect(leadPayloadSchema.safeParse({ firstName: 'No contact' }).success).toBe(false)
    expect(leadPayloadSchema.safeParse({ email: 'bad' }).success).toBe(false)
    const p = leadPayloadSchema.parse({ phone: '058-447-7757', email: '', source: 'Landing page', sourceDetail: '/realestate · call_back' })
    expect(p).toMatchObject({ phone: '058-447-7757', email: undefined, source: 'Landing page', sourceDetail: '/realestate · call_back' })
  })
})

d('phone-only leads and backfills', async () => {
  const { ingestLead, leadPayloadSchema } = await import('@/lib/leads')
  const prisma = new PrismaClient()
  beforeEach(async () => {
    await prisma.activityLog.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.lead.deleteMany()
  })
  afterAll(async () => prisma.$disconnect())

  it('creates a phone-only lead and matches it again by phone in another format, filling in the email later', async () => {
    const a = await ingestLead(leadPayloadSchema.parse({ phone: '058-447-7757', firstName: 'Avi', source: 'Landing page', sourceDetail: '/start · start_project' }))
    expect(a.created).toBe(true)
    const b = await ingestLead(leadPayloadSchema.parse({ phone: '+972 58 447 7757', email: 'avi@example.com', source: 'Website contact form' }))
    expect(b).toMatchObject({ leadId: a.leadId, created: false })
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: a.leadId } })
    expect(lead).toMatchObject({ email: 'avi@example.com', source: 'Landing page', sourceDetail: '/start · start_project' })
    expect(await prisma.lead.count()).toBe(1)
  })

  it('does not merge two different people who share a phone but have different emails', async () => {
    await ingestLead(leadPayloadSchema.parse({ phone: '0501234567', email: 'one@example.com' }))
    await ingestLead(leadPayloadSchema.parse({ phone: '050-123-4567', email: 'two@example.com' }))
    expect(await prisma.lead.count()).toBe(2)
  })

  it('backfill keeps the original date, tags it imported, and re-running is a no-op', async () => {
    const payload = leadPayloadSchema.parse({ email: 'old@example.com', message: 'hi', source: 'Website contact form', submittedAt: '2025-03-01T10:00:00.000Z', backfill: true })
    const first = await ingestLead(payload)
    const again = await ingestLead(payload)
    expect(again).toMatchObject({ leadId: first.leadId, created: false, needsAssignment: false })
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: first.leadId } })
    expect(lead.createdAt.toISOString()).toBe('2025-03-01T10:00:00.000Z')
    expect(lead.tags).toContain('imported')
    expect(lead.message).toBe('hi')
    expect(await prisma.activityLog.count({ where: { entityId: first.leadId } })).toBe(1)
  })
})
