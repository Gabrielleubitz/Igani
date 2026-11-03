/** Website leads go to the teammate chosen in Settings; anything unusual falls back to round-robin. Disposable Postgres (TEST_DATABASE_URL). */
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

const sent: { to: string | string[]; subject: string }[] = []
vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (m: { to: string | string[]; subject: string }) => {
        sent.push(m)
        return { data: { id: 're_1' }, error: null }
      },
    }
  },
}))

const d = testDb ? describe : describe.skip

d('assignLeadToDefaultOwner', async () => {
  const { assignLeadToDefaultOwner } = await import('@/lib/leads')
  const prisma = new PrismaClient()

  beforeEach(async () => {
    sent.length = 0
    await prisma.siteSetting.deleteMany()
    await prisma.activityLog.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    await prisma.allowedUser.deleteMany()
  })
  afterAll(async () => prisma.$disconnect())

  const person = async (email: string, role: 'ADMIN' | 'SALES', active = true) => {
    await prisma.allowedUser.create({ data: { email, role, active } })
    return prisma.user.create({ data: { email, name: email.split('@')[0], role } })
  }
  const lead = (extra: Record<string, string> = {}) => prisma.lead.create({ data: { email: 'noa@acme.com', firstName: 'Noa', source: 'Website contact form', ...extra } })
  const setOwner = (email: string) => prisma.siteSetting.create({ data: { key: 'leads.defaultOwnerEmail', value: email } })
  const ownerOf = async (id: string) => (await prisma.lead.findUniqueOrThrow({ where: { id } })).assignedToId

  it('assigns to the chosen teammate (not the next rep in rotation) and emails them', async () => {
    const gabriel = await person('gabriel@igani.co', 'ADMIN')
    await person('dana@igani.co', 'SALES')
    await setOwner('Gabriel@igani.co')
    const l = await lead()
    expect(await assignLeadToDefaultOwner(l.id)).toBe(gabriel.id)
    expect(await ownerOf(l.id)).toBe(gabriel.id)
    expect(sent.flatMap((m) => [m.to].flat())).toEqual(['gabriel@igani.co'])
    const log = await prisma.activityLog.findMany({ where: { action: 'lead.assigned' } })
    expect(log).toHaveLength(1)
    expect(JSON.stringify(log[0]!.metadata)).toContain('default-owner')
  })

  it('uses round-robin when nobody is chosen', async () => {
    const dana = await person('dana@igani.co', 'SALES')
    const l = await lead()
    expect(await assignLeadToDefaultOwner(l.id)).toBe(dana.id)
  })

  it('uses round-robin when the chosen person is unknown or no longer active', async () => {
    const dana = await person('dana@igani.co', 'SALES')
    await person('gone@igani.co', 'ADMIN', false)
    await setOwner('nobody@igani.co')
    const a = await lead()
    expect(await assignLeadToDefaultOwner(a.id)).toBe(dana.id)
    await prisma.siteSetting.update({ where: { key: 'leads.defaultOwnerEmail' }, data: { value: 'gone@igani.co' } })
    const b = await lead({ email: 'b@acme.com' })
    expect(await assignLeadToDefaultOwner(b.id)).toBe(dana.id)
  })

  it('never takes a lead that already has an owner', async () => {
    await person('gabriel@igani.co', 'ADMIN')
    const dana = await person('dana@igani.co', 'SALES')
    await setOwner('gabriel@igani.co')
    const l = await lead({ assignedToId: dana.id })
    expect(await assignLeadToDefaultOwner(l.id)).toBeNull()
    expect(await ownerOf(l.id)).toBe(dana.id)
    expect(sent).toHaveLength(0)
  })
})
