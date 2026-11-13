import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
Object.assign(process.env, { NEXTAUTH_SECRET: 'test-secret-test-secret-test-secret', NEXT_PUBLIC_APP_URL: 'https://app.igani.co' })

vi.mock('next/cache', () => ({ revalidatePath: () => undefined }))
const session = { user: null as null | { id: string; email: string; role: 'ADMIN' | 'SALES'; name: string | null } }
vi.mock('@/lib/auth', async (orig) => ({
  ...(await orig<typeof import('@/lib/auth')>()),
  requireUser: async (roles?: string[]) => {
    if (roles && session.user && !roles.includes(session.user.role)) throw new Error('Forbidden')
    return session.user
  },
}))

const d = testDb ? describe : describe.skip

d('exporting leads to CSV is for admins only', async () => {
  const { exportLeadsCsv } = await import('@/app/actions/leads')
  const prisma = new PrismaClient()
  let repId = ''
  let adminId = ''
  beforeEach(async () => {
    await prisma.activityLog.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    adminId = (await prisma.user.create({ data: { email: 'admin@igani.co', name: 'Admin', role: 'ADMIN' } })).id
    repId = (await prisma.user.create({ data: { email: 'rita@igani.co', name: 'Rita', role: 'SALES' } })).id
    await prisma.lead.create({ data: { email: 'dana@acme.co', firstName: 'Dana', assignedToId: repId } })
  })
  afterAll(async () => {
    await prisma.activityLog.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  it('refuses a salesperson, even for the leads they own', async () => {
    session.user = { id: repId, email: 'rita@igani.co', role: 'SALES', name: 'Rita' }
    const r = await exportLeadsCsv({})
    expect(r.ok).toBe(false)
  })

  it('gives an admin the file', async () => {
    session.user = { id: adminId, email: 'admin@igani.co', role: 'ADMIN', name: 'Admin' }
    const r = await exportLeadsCsv({})
    expect(r.ok && r.data.csv).toContain('dana@acme.co')
  })
})
