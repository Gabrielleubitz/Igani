import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb

const d = testDb ? describe : describe.skip

d('salesperson stats', async () => {
  const { loadRepStats } = await import('@/lib/team-stats')
  const prisma = new PrismaClient()
  beforeEach(async () => {
    await prisma.activityLog.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.allowedUser.deleteMany()
    await prisma.user.deleteMany()
  })
  afterAll(async () => prisma.$disconnect())

  it('totals wins, win rate, open leads and open tasks per salesperson', async () => {
    const admin = await prisma.user.create({ data: { email: 'a@igani.co', name: 'Ada', role: 'ADMIN' } })
    const ann = await prisma.user.create({ data: { email: 'ann@igani.co', name: 'Ann', role: 'SALES' } })
    const bo = await prisma.user.create({ data: { email: 'bo@igani.co', name: 'Bo', role: 'SALES' } })
    await prisma.lead.create({ data: { email: 'w1@x.com', assignedToId: ann.id, status: 'WON', dealValue: 10000 } })
    await prisma.lead.create({ data: { email: 'w2@x.com', assignedToId: ann.id, status: 'WON', dealValue: 5000 } })
    await prisma.lead.create({ data: { email: 'l1@x.com', assignedToId: ann.id, status: 'LOST' } })
    const open = await prisma.lead.create({ data: { email: 'o1@x.com', assignedToId: ann.id, status: 'CONTACTED' } })
    await prisma.lead.create({ data: { email: 'o2@x.com', assignedToId: bo.id, status: 'NEW' } })
    await prisma.activityLog.create({ data: { entityType: 'LEAD', entityId: open.id, action: 'task.created', metadata: { taskId: 't1', title: 'Call back', dueAt: '2020-01-01T00:00:00.000Z', assigneeId: ann.id, priority: 'MEDIUM' } } })

    const stats = await loadRepStats({ id: admin.id, role: 'ADMIN' })
    const a = stats.find((s) => s.id === ann.id)
    const b = stats.find((s) => s.id === bo.id)
    expect(stats).toHaveLength(2) // admins are not in the salesperson list
    expect(a).toMatchObject({ won: 2, lost: 1, wonValue: 15000, conversion: 67, openLeads: 1, openTasks: 1, overdueTasks: 1 })
    expect(b).toMatchObject({ won: 0, wonValue: 0, conversion: null, openLeads: 1, openTasks: 0 })
  })
})
