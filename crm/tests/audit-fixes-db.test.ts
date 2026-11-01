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

let who = { id: '', role: 'ADMIN', email: 'a@igani.co', name: 'Admin' }
vi.mock('@/lib/auth', () => ({ requireUser: async () => who, currentUserOrNull: async () => who }))
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }))
vi.mock('@/lib/email', () => ({
  sendLeadAssignedEmail: async () => 'e1',
  sendNewLeadAlertEmail: async () => 'e2',
}))

const d = testDb ? describe : describe.skip

d('audit fixes', async () => {
  const leadActions = await import('@/app/actions/leads')
  const dealActions = await import('@/app/actions/deals')
  const taskActions = await import('@/app/sales/actions')
  const { reassignUserWork, bulkUpdateLeadsTx } = await import('@/lib/leads')
  const { applyCommissionChoice } = await import('@/lib/deals')
  const { loadTasks, canOpenLeadTask } = await import('@/lib/tasks')
  const prisma = new PrismaClient()
  let admin = ''
  let ann = ''
  let bo = ''
  beforeEach(async () => {
    await prisma.activityLog.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.allowedUser.deleteMany()
    await prisma.user.deleteMany()
    admin = (await prisma.user.create({ data: { email: 'a@igani.co', name: 'Admin', role: 'ADMIN' } })).id
    ann = (await prisma.user.create({ data: { email: 'ann@igani.co', name: 'Ann', role: 'SALES' } })).id
    bo = (await prisma.user.create({ data: { email: 'bo@igani.co', name: 'Bo', role: 'SALES' } })).id
    await prisma.allowedUser.createMany({ data: [{ email: 'ann@igani.co', role: 'SALES' }, { email: 'bo@igani.co', role: 'SALES', commissionTerms: { baseRatePct: 50 } }] })
    who = { id: admin, role: 'ADMIN', email: 'a@igani.co', name: 'Admin' }
  })
  afterAll(async () => prisma.$disconnect())
  const asAdmin = (): void => void (who = { id: admin, role: 'ADMIN', email: 'a@igani.co', name: 'Admin' })
  const asAnn = (): void => void (who = { id: ann, role: 'SALES', email: 'ann@igani.co', name: 'Ann' })
  const won = (email: string, extra: Record<string, unknown> = {}) =>
    prisma.lead.create({ data: { email, assignedToId: ann, status: 'WON', quotedPrice: 25_000, commissionTotal: 6_500, commissionSnapshot: { terms: { baseRatePct: 30, threshold: 15000, incrementSize: 5000, bonusPerIncrement: 1000 }, breakdown: { total: 6500 } }, ...extra } })

  it('1. only an admin can change a lead’s email', async () => {
    const l = await prisma.lead.create({ data: { email: 'client@x.com', assignedToId: ann } })
    asAnn()
    expect((await leadActions.updateLead(l.id, { email: 'cfo@igani.co' })).ok).toBe(false)
    expect((await leadActions.updateLead(l.id, { company: 'Acme' })).ok).toBe(true) // other edits are fine
    asAdmin()
    expect((await leadActions.updateLead(l.id, { email: 'new@x.com' })).ok).toBe(true)
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: l.id } })).email).toBe('new@x.com')
  })

  it('2. deactivating a rep unassigns their leads but keeps unpaid won deals with them', async () => {
    const open = await prisma.lead.create({ data: { email: 'o@x.com', assignedToId: ann, status: 'CONTACTED' } })
    const unpaid = await won('w1@x.com')
    const paid = await won('w2@x.com', { finalPaymentReceivedAt: new Date(), finalPaidAt: new Date() })
    await prisma.$transaction((tx) => reassignUserWork(ann, null, admin, tx))
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: open.id } })).assignedToId).toBeNull()
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: unpaid.id } })).assignedToId).toBe(ann)
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: paid.id } })).assignedToId).toBeNull()
  })

  it('3. a commission that was paid out cannot be recalculated', async () => {
    const l = await won('p@x.com', { finalPaymentReceivedAt: new Date(), finalPaidAt: new Date() })
    expect((await dealActions.recalculateWonCommission(l.id)).ok).toBe(false)
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: l.id } })).commissionTotal).toBe(6_500)
  })

  it('4. a deal cannot leave Won once a client payment or payout is recorded', async () => {
    const l = await won('q@x.com', { finalPaymentReceivedAt: new Date() })
    const res = await leadActions.updateLeadStatus(l.id, 'PROPOSAL_SENT')
    expect(res.ok).toBe(false)
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: l.id } })).status).toBe('WON')
    const free = await won('r@x.com')
    expect((await leadActions.updateLeadStatus(free.id, 'PROPOSAL_SENT')).ok).toBe(true) // nothing recorded yet: allowed
    const bulk = await won('s@x.com', { finalPaidAt: new Date(), finalPaymentReceivedAt: new Date() })
    expect((await leadActions.bulkUpdateLeads([bulk.id], { status: 'CONTACTED' })).ok).toBe(false)
  })

  it('5. winning in bulk freezes the commission for leads with a price and skips the ones without', async () => {
    const priced = await prisma.lead.create({ data: { email: 'b1@x.com', assignedToId: ann, status: 'PROPOSAL_SENT', quotedPrice: 25_000 } })
    const noPrice = await prisma.lead.create({ data: { email: 'b2@x.com', assignedToId: ann, status: 'PROPOSAL_SENT' } })
    const out = await prisma.$transaction(() => bulkUpdateLeadsTx([priced.id, noPrice.id], { status: 'WON' }, admin))
    expect(out.skippedNoPrice).toEqual([noPrice.id])
    expect(await prisma.lead.findUniqueOrThrow({ where: { id: priced.id } })).toMatchObject({ status: 'WON', commissionTotal: 6_500 })
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: noPrice.id } })).status).toBe('PROPOSAL_SENT')
  })

  it('6. a task can only go to an admin or the lead’s owner, enforced on the server', async () => {
    const l = await prisma.lead.create({ data: { email: 't@x.com', assignedToId: ann } })
    asAnn()
    expect((await taskActions.createTask(l.id, 'Call back', null, 'MEDIUM', bo)).ok).toBe(false)
    expect((await taskActions.createTask(l.id, 'Call back', null, 'MEDIUM', ann)).ok).toBe(true)
    expect((await taskActions.createTask(l.id, 'Ask the boss', null, 'MEDIUM', admin)).ok).toBe(true)
  })

  it('8. when a lead changes hands its open tasks follow it, and reminders only reach people who can open the lead', async () => {
    const l = await prisma.lead.create({ data: { email: 'm@x.com', assignedToId: ann } })
    asAnn()
    await taskActions.createTask(l.id, 'Follow up', null, 'MEDIUM', ann)
    asAdmin()
    expect((await leadActions.assignLead(l.id, bo)).ok).toBe(true)
    const tasks = await loadTasks([l.id])
    expect(tasks.map((t) => t.assigneeId)).toEqual([bo])
    expect(canOpenLeadTask({ id: ann, role: 'SALES' }, { assignedToId: bo })).toBe(false)
    expect(canOpenLeadTask({ id: bo, role: 'SALES' }, { assignedToId: bo })).toBe(true)
    expect(canOpenLeadTask({ id: admin, role: 'ADMIN' }, { assignedToId: bo })).toBe(true)
    expect(canOpenLeadTask({ id: bo, role: 'SALES' }, undefined)).toBe(false)
  })

  it('11. reassigning a won deal needs a commission decision', async () => {
    const l = await won('c@x.com')
    expect((await leadActions.assignLead(l.id, bo)).ok).toBe(false) // no decision yet
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: l.id } })).assignedToId).toBe(ann)

    expect((await leadActions.assignLead(l.id, bo, { mode: 'keep' })).ok).toBe(true)
    expect(await prisma.lead.findUniqueOrThrow({ where: { id: l.id } })).toMatchObject({ assignedToId: bo, commissionTotal: 6_500 })

    expect((await leadActions.assignLead(l.id, ann, { mode: 'recalculate' })).ok).toBe(true) // Ann has the default 30%
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: l.id } })).commissionTotal).toBe(6_500)
    expect((await leadActions.assignLead(l.id, bo, { mode: 'recalculate' })).ok).toBe(true) // Bo has 50%: 15,000 × 50% + 2 × 1,000
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: l.id } })).commissionTotal).toBe(9_500)

    expect((await leadActions.assignLead(l.id, ann, { mode: 'custom', amount: 4_000 })).ok).toBe(true)
    expect(await prisma.lead.findUniqueOrThrow({ where: { id: l.id } })).toMatchObject({ assignedToId: ann, commissionTotal: 4_000 })
  })

  it('11. a commission already paid out cannot move to another rep, and bulk reassign refuses won deals', async () => {
    const paid = await won('d@x.com', { finalPaymentReceivedAt: new Date(), finalPaidAt: new Date() })
    expect((await leadActions.assignLead(paid.id, bo, { mode: 'keep' })).ok).toBe(false)
    await expect(applyCommissionChoice(paid.id, 'custom', 1, admin)).rejects.toThrow()
    const open = await won('e@x.com')
    expect((await leadActions.bulkUpdateLeads([open.id], { assigneeId: bo })).ok).toBe(false)
  })

  it('13. a sign-in redirect raised inside an action reaches Next.js instead of becoming "something went wrong"', async () => {
    const { toActionError } = await import('@/app/actions/result')
    const redirect = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;replace;/login;307;' })
    expect(() => toActionError(redirect)).toThrow(redirect)
  })
})
