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

d('quoted price, commission snapshot and milestones', async () => {
  const { changeLeadStatus } = await import('@/lib/leads')
  const { snapshotWonCommission, setQuotedPrice } = await import('@/lib/deals')
  const { commissionStatus, salespersonCommissionView } = await import('@/lib/commission')
  const prisma = new PrismaClient()
  let repId = ''
  beforeEach(async () => {
    await prisma.activityLog.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.allowedUser.deleteMany()
    await prisma.user.deleteMany()
    await prisma.allowedUser.create({ data: { email: 'rep@igani.co', role: 'SALES' } })
    repId = (await prisma.user.create({ data: { email: 'rep@igani.co', name: 'Rep', role: 'SALES' } })).id
  })
  afterAll(async () => prisma.$disconnect())

  const lead = (email: string) => prisma.lead.create({ data: { email, assignedToId: repId } })

  it('marking a deal won with a price freezes the commission on the default terms (₪25,000 → ₪9,500)', async () => {
    const l = await lead('a@x.com')
    await changeLeadStatus(l.id, 'WON', null, { quotedPrice: 25_000 })
    expect(await prisma.lead.findUniqueOrThrow({ where: { id: l.id } })).toMatchObject({ status: 'WON', quotedPrice: 25_000, currency: 'ILS', commissionTotal: 9_500 })
  })

  it('later changes to the salesperson’s terms do not touch a deal that is already won', async () => {
    const l = await lead('b@x.com')
    await changeLeadStatus(l.id, 'WON', null, { quotedPrice: 25_000 })
    await prisma.allowedUser.update({ where: { email: 'rep@igani.co' }, data: { commissionTerms: { baseRatePct: 50 } } })
    await snapshotWonCommission(l.id) // e.g. a price edit or re-save: still the frozen number unless recalculated explicitly
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: l.id } })).commissionTotal).toBe(9_500)
    const next = await lead('c@x.com')
    await changeLeadStatus(next.id, 'WON', null, { quotedPrice: 10_000 })
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: next.id } })).commissionTotal).toBe(5_000) // new deals use the new 50% terms
  })

  it('a per-deal override applies to that deal only', async () => {
    const l = await lead('d@x.com')
    await prisma.lead.update({ where: { id: l.id }, data: { commissionOverrides: { baseRatePct: 20, threshold: 15_000, incrementSize: 5_000, bonusPerIncrement: 1_000 } } })
    await changeLeadStatus(l.id, 'WON', null, { quotedPrice: 10_000 })
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: l.id } })).commissionTotal).toBe(2_000)
    expect(await prisma.allowedUser.findUniqueOrThrow({ where: { email: 'rep@igani.co' } })).toMatchObject({ commissionTerms: null })
  })

  it('without a price there is no commission yet; once client money is in the deal is no longer re-frozen by a re-save', async () => {
    const l = await lead('e@x.com')
    await changeLeadStatus(l.id, 'WON', null)
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: l.id } })).commissionTotal).toBeNull()
    await prisma.lead.update({ where: { id: l.id }, data: { quotedPrice: 20_000 } })
    await snapshotWonCommission(l.id)
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: l.id } })).commissionTotal).toBe(7_000)
    await prisma.lead.update({ where: { id: l.id }, data: { quotedPrice: 30_000, finalPaymentReceivedAt: new Date() } })
    await snapshotWonCommission(l.id)
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: l.id } })).commissionTotal).toBe(7_000) // protected
    await snapshotWonCommission(l.id, undefined, { force: true }) // the admin's explicit recalculation
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: l.id } })).commissionTotal).toBe(12_000)
  })

  it('what a salesperson is given for a won deal is only the commission, paid and pending', async () => {
    const l = await lead('f@x.com')
    await changeLeadStatus(l.id, 'WON', null, { quotedPrice: 25_000 })
    await prisma.lead.update({ where: { id: l.id }, data: { finalPaymentReceivedAt: new Date() } })
    const row = await prisma.lead.findUniqueOrThrow({ where: { id: l.id } })
    expect(salespersonCommissionView(commissionStatus(row))).toEqual({ total: 9_500, paid: 0, pending: 9_500 })
  })

  it('quoting a price moves a lead that is earlier in the pipeline to Proposal sent', async () => {
    const admin = (await prisma.user.create({ data: { email: 'admin@igani.co', role: 'ADMIN' } })).id
    for (const status of ['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'DEMO_SENT'] as const) {
      const l = await prisma.lead.create({ data: { email: `${status}@x.com`, assignedToId: repId, status } })
      expect(await prisma.$transaction((tx) => setQuotedPrice(l.id, 17_000, admin, tx))).toEqual({ changed: true, movedToProposal: true })
      expect(await prisma.lead.findUniqueOrThrow({ where: { id: l.id } })).toMatchObject({ status: 'PROPOSAL_SENT', quotedPrice: 17_000 })
      expect(await prisma.activityLog.count({ where: { entityId: l.id, action: 'lead.status_changed' } })).toBe(1)
    }
  })

  it('leads already at Proposal sent, Won or Lost stay put; clearing or repeating a price changes nothing', async () => {
    const admin = (await prisma.user.create({ data: { email: 'admin2@igani.co', role: 'ADMIN' } })).id
    for (const status of ['PROPOSAL_SENT', 'WON', 'LOST'] as const) {
      const l = await prisma.lead.create({ data: { email: `${status}@y.com`, assignedToId: repId, status } })
      expect((await prisma.$transaction((tx) => setQuotedPrice(l.id, 9_000, admin, tx))).movedToProposal).toBe(false)
      expect((await prisma.lead.findUniqueOrThrow({ where: { id: l.id } })).status).toBe(status)
    }
    const l = await prisma.lead.create({ data: { email: 'c@y.com', assignedToId: repId, status: 'CONTACTED' } })
    expect(await prisma.$transaction((tx) => setQuotedPrice(l.id, null, admin, tx))).toEqual({ changed: false, movedToProposal: false })
    expect(await prisma.$transaction((tx) => setQuotedPrice(l.id, 0, admin, tx))).toEqual({ changed: true, movedToProposal: false })
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: l.id } })).status).toBe('CONTACTED')
  })
})
