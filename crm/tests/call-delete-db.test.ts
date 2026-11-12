import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
Object.assign(process.env, { NEXTAUTH_SECRET: 'test-secret-test-secret-test-secret', NEXT_PUBLIC_APP_URL: 'https://app.igani.co' })
for (const k of ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_API_KEY_SID', 'TWILIO_API_KEY_SECRET', 'TWILIO_TWIML_APP_SID']) delete process.env[k]

vi.mock('next/cache', () => ({ revalidatePath: () => undefined }))
const session = { user: null as null | { id: string; email: string; role: 'ADMIN' | 'SALES'; name: string | null } }
vi.mock('@/lib/auth', async (orig) => ({ ...(await orig<typeof import('@/lib/auth')>()), requireUser: async (roles?: string[]) => {
  if (roles && session.user && !roles.includes(session.user.role)) throw new Error('Forbidden')
  return session.user
} }))

const d = testDb ? describe : describe.skip

d('deleting a call (admin only)', async () => {
  const { deleteCall } = await import('@/app/actions/calls')
  const prisma = new PrismaClient()
  let adminId = ''
  let repId = ''
  let otherId = ''
  const mk = (data: Partial<Parameters<typeof prisma.call.create>[0]['data']> = {}) =>
    prisma.call.create({ data: { userId: repId, direction: 'OUTBOUND', status: 'COMPLETED', fromNumber: '+972531111111', toNumber: '+972501234567', durationSec: 200, startedAt: new Date(Date.now() - 3600_000), ...data } as never })
  beforeEach(async () => {
    await prisma.activityLog.deleteMany()
    await prisma.callShare.deleteMany()
    await prisma.call.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.booking.deleteMany() // meetings left by earlier test files would block deleting their hosts
    await prisma.user.deleteMany()
    adminId = (await prisma.user.create({ data: { email: 'admin@igani.co', name: 'Admin', role: 'ADMIN' } })).id
    repId = (await prisma.user.create({ data: { email: 'rita@igani.co', name: 'Rita', role: 'SALES' } })).id
    otherId = (await prisma.user.create({ data: { email: 'sam@igani.co', name: 'Sam', role: 'SALES' } })).id
    session.user = { id: adminId, email: 'admin@igani.co', role: 'ADMIN', name: 'Admin' }
  })
  afterAll(async () => {
    await prisma.activityLog.deleteMany()
    await prisma.callShare.deleteMany()
    await prisma.call.deleteMany()
    await prisma.booking.deleteMany() // meetings left by earlier test files would block deleting their hosts
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  it('removes the call and who it was shared with, and writes an audit entry', async () => {
    const call = await mk()
    await prisma.callShare.create({ data: { callId: call.id, userId: otherId } })
    const r = await deleteCall(call.id)
    expect(r.ok).toBe(true)
    expect(await prisma.call.findUnique({ where: { id: call.id } })).toBeNull()
    expect(await prisma.callShare.count()).toBe(0)
    const log = await prisma.activityLog.findFirstOrThrow({ where: { action: 'call.deleted' } })
    expect(log).toMatchObject({ actorId: adminId })
    expect((log.metadata as { callId: string }).callId).toBe(call.id)
  })

  it('keeps the lead and its other calls', async () => {
    const lead = await prisma.lead.create({ data: { email: 'a@b.co', assignedToId: repId } })
    const a = await mk({ leadId: lead.id })
    const b = await mk({ leadId: lead.id })
    await deleteCall(a.id)
    expect(await prisma.lead.count()).toBe(1)
    expect((await prisma.call.findMany()).map((c) => c.id)).toEqual([b.id])
  })

  it('refuses a salesperson', async () => {
    const call = await mk()
    session.user = { id: repId, email: 'rita@igani.co', role: 'SALES', name: 'Rita' }
    const r = await deleteCall(call.id)
    expect(r.ok).toBe(false)
    expect(await prisma.call.count()).toBe(1)
  })

  it('refuses a call that is still going, but not one stuck for hours', async () => {
    const live = await mk({ status: 'IN_PROGRESS', startedAt: new Date(Date.now() - 60_000) })
    const r = await deleteCall(live.id)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/still going/)
    const stuck = await mk({ status: 'IN_PROGRESS', startedAt: new Date(Date.now() - 5 * 3600_000) })
    expect((await deleteCall(stuck.id)).ok).toBe(true)
  })

  it('says so when the call does not exist', async () => {
    const r = await deleteCall('c' + 'a'.repeat(24))
    expect(r.ok).toBe(false)
  })
})
