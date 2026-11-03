import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

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

const d = testDb ? describe : describe.skip

d('publishing an offer moves the lead to Proposal sent', async () => {
  const { advanceLeadOnPublish } = await import('@/lib/offers')
  const prisma = new PrismaClient()
  beforeEach(async () => {
    await prisma.activityLog.deleteMany()
    await prisma.offer.deleteMany()
    await prisma.lead.deleteMany()
  })
  afterAll(async () => prisma.$disconnect())

  const setup = async (status: 'NEW' | 'CONTACTED' | 'DEMO_SCHEDULED' | 'DEMO_SENT' | 'PROPOSAL_SENT' | 'SIGNED' | 'WON' | 'LOST') => {
    const lead = await prisma.lead.create({ data: { email: `${status.toLowerCase()}@x.com`, status } })
    const offer = await prisma.offer.create({ data: { slug: `o-${status.toLowerCase().replace(/_/g, '-')}`, leadId: lead.id, title: 'Offer' } })
    return { lead, offer }
  }
  const publish = (leadId: string, offerId: string) => prisma.$transaction((tx) => advanceLeadOnPublish(tx, leadId, offerId, null, 'studio'))

  it.each(['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'DEMO_SENT'] as const)('moves a %s lead forward and logs why', async (status) => {
    const { lead, offer } = await setup(status)
    expect(await publish(lead.id, offer.id)).toBe(true)
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).status).toBe('PROPOSAL_SENT')
    const log = await prisma.activityLog.findFirstOrThrow({ where: { entityId: lead.id, action: 'lead.status_changed' } })
    expect(log.metadata).toMatchObject({ from: status, to: 'PROPOSAL_SENT', auto: 'offer-published', offerId: offer.id })
  })

  it.each(['PROPOSAL_SENT', 'SIGNED', 'WON', 'LOST'] as const)('never moves a %s lead back', async (status) => {
    const { lead, offer } = await setup(status)
    expect(await publish(lead.id, offer.id)).toBe(false)
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).status).toBe(status)
    expect(await prisma.activityLog.count({ where: { entityId: lead.id } })).toBe(0)
  })
})
