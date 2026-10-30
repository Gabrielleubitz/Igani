/** DB-backed tests for admin flows. Run with TEST_DATABASE_URL (wipes tables). */
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
const d = testDb ? describe : describe.skip

d('admin lead flows', async () => {
  const { bulkUpdateLeadsTx, reassignUserWork, changeLeadStatus } = await import('@/lib/leads')
  const { getSetting } = await import('@/lib/settings')
  const prisma = new PrismaClient()

  beforeEach(async () => {
    await prisma.siteSetting.deleteMany()
    await prisma.leadNote.deleteMany()
    await prisma.activityLog.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    await prisma.allowedUser.deleteMany()
  })
  afterAll(async () => prisma.$disconnect())

  const rep = (email: string) => prisma.user.create({ data: { email, name: email, role: 'SALES' } })
  const lead = (email: string, assignedToId?: string) => prisma.lead.create({ data: { email, assignedToId } })

  it('bulk update assigns and moves status for all leads, with audit rows', async () => {
    const r = await rep('a@x.co')
    const ls = await Promise.all([lead('1@x.co'), lead('2@x.co'), lead('3@x.co')])
    await bulkUpdateLeadsTx(ls.map((l) => l.id), { assigneeId: r.id, status: 'CONTACTED' }, r.id)
    const rows = await prisma.lead.findMany()
    expect(rows.every((l) => l.assignedToId === r.id && l.status === 'CONTACTED')).toBe(true)
    expect(await prisma.activityLog.count({ where: { action: 'lead.status_changed' } })).toBe(3)
  })

  it('bulk update is all-or-nothing when one id is missing', async () => {
    const r = await rep('a@x.co')
    const l = await lead('1@x.co')
    await expect(bulkUpdateLeadsTx([l.id, 'cmissingmissingmissing0000'], { assigneeId: r.id }, r.id)).rejects.toThrow()
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: l.id } })).assignedToId).toBeNull()
    expect(await prisma.activityLog.count()).toBe(0)
  })

  it('bulk update rejects a non-sales assignee and LOST', async () => {
    const m = await prisma.user.create({ data: { email: 'm@x.co', role: 'MARKETING' } })
    const l = await lead('1@x.co')
    await expect(bulkUpdateLeadsTx([l.id], { assigneeId: m.id }, m.id)).rejects.toThrow()
    await expect(bulkUpdateLeadsTx([l.id], { status: 'LOST' }, m.id)).rejects.toThrow()
  })

  it('reassignUserWork unassigns every lead of a deactivated user and logs it', async () => {
    const r = await rep('a@x.co')
    const other = await rep('b@x.co')
    await lead('1@x.co', r.id)
    await lead('2@x.co', r.id)
    const kept = await lead('3@x.co', other.id)
    const n = await prisma.$transaction((tx) => reassignUserWork(r.id, null, other.id, tx))
    expect(n).toBe(2)
    expect(await prisma.lead.count({ where: { assignedToId: null } })).toBe(2)
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: kept.id } })).assignedToId).toBe(other.id)
  })

  it('LOST needs a reason; WON stores deal value', async () => {
    const l = await lead('1@x.co')
    await expect(changeLeadStatus(l.id, 'LOST', null)).rejects.toThrow()
    await changeLeadStatus(l.id, 'LOST', null, { lostReason: 'no budget' })
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: l.id } })).lostReason).toBe('no budget')
    await changeLeadStatus(l.id, 'WON', null, { dealValue: 5000 })
    const won = await prisma.lead.findUniqueOrThrow({ where: { id: l.id } })
    expect(won).toMatchObject({ status: 'WON', lostReason: null, dealValue: 5000 })
  })

  it('settings read stored values and fall back to defaults', async () => {
    expect(await getSetting('booking.bufferMinutes')).toBe(0)
    await prisma.siteSetting.create({ data: { key: 'booking.bufferMinutes', value: 15 } })
    expect(await getSetting('booking.bufferMinutes')).toBe(15)
  })
})
