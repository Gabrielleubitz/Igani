/**
 * The "new lead" alert end to end against a disposable Postgres (TEST_DATABASE_URL), with Resend mocked at the
 * module boundary: real recipients lookup, real templates, real audit rows.
 */
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

type Sent = { to: string[]; subject: string; html: string }
const sent: Sent[] = []
let failWith: string | null = null
vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (m: Sent) => {
        if (failWith) return { data: null, error: { message: failWith } }
        sent.push(m)
        return { data: { id: 're_1' }, error: null }
      },
    }
  },
}))

const d = testDb ? describe : describe.skip

d('new-lead alerts', async () => {
  const { notifyTeamOfNewLead } = await import('@/lib/leads')
  const prisma = new PrismaClient()

  beforeEach(async () => {
    sent.length = 0
    failWith = null
    await prisma.siteSetting.deleteMany()
    await prisma.activityLog.deleteMany()
    // other DB test files run in the same database first and can leave bookings that point at users
    await prisma.booking.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    await prisma.allowedUser.deleteMany()
  })
  afterAll(async () => prisma.$disconnect())

  const allow = (email: string, role: 'ADMIN' | 'SALES', active = true) => prisma.allowedUser.create({ data: { email, role, active } })
  const rep = async (email: string, name: string) => prisma.user.create({ data: { email, name, role: 'SALES' } })
  const lead = (email: string, extra: Record<string, string> = {}) => prisma.lead.create({ data: { email, firstName: 'Noa', lastName: 'Levi', source: 'Other', ...extra } })
  const alertLog = (action: string) => prisma.activityLog.findMany({ where: { action } })

  it('emails every active admin "New lead from <salesman>" and records that it was sent', async () => {
    await allow('ann@igani.co', 'ADMIN')
    await allow('bo@igani.co', 'ADMIN')
    await allow('gone@igani.co', 'ADMIN', false)
    await allow('dana@igani.co', 'SALES')
    const dana = await rep('dana@igani.co', 'Dana Cohen')
    const l = await lead('noa@acme.com')
    await notifyTeamOfNewLead(l.id, { addedBy: { id: dana.id, name: 'Dana Cohen', email: 'dana@igani.co' } })
    expect(sent).toHaveLength(1)
    expect([...sent[0]!.to].sort()).toEqual(['ann@igani.co', 'bo@igani.co'])
    expect(sent[0]!.subject).toBe('New lead from Dana Cohen')
    expect(sent[0]!.html).toContain('Dana Cohen added a new lead')
    expect(await alertLog('lead.alert_sent')).toHaveLength(1)
  })

  it('still reaches an admin who adds the lead themselves (a lone admin gets it too)', async () => {
    await allow('ann@igani.co', 'ADMIN')
    const ann = await prisma.user.create({ data: { email: 'ann@igani.co', name: 'Ann', role: 'ADMIN' } })
    const l = await lead('noa@acme.com')
    await notifyTeamOfNewLead(l.id, { addedBy: { id: ann.id, name: 'Ann', email: 'ann@igani.co' } })
    expect(sent).toHaveLength(1)
    expect(sent[0]!.to).toEqual(['ann@igani.co'])
  })

  it('adds the Settings notification list without duplicating an admin', async () => {
    await allow('ann@igani.co', 'ADMIN')
    await prisma.siteSetting.create({ data: { key: 'notifications.emails', value: ['ann@igani.co', 'ops@igani.co'] } })
    const l = await lead('noa@acme.com')
    await notifyTeamOfNewLead(l.id)
    expect([...sent[0]!.to].sort()).toEqual(['ann@igani.co', 'ops@igani.co'])
    expect(sent[0]!.subject).toBe('New lead: Noa Levi')
  })

  it('stays quiet when the Settings switch is off, and says so in the audit log', async () => {
    await allow('ann@igani.co', 'ADMIN')
    await prisma.siteSetting.create({ data: { key: 'notifications.newLead', value: false } })
    const l = await lead('noa@acme.com')
    await notifyTeamOfNewLead(l.id)
    expect(sent).toHaveLength(0)
    const [row] = await alertLog('lead.alert_skipped')
    expect(JSON.stringify(row?.metadata)).toContain('switched off')
  })

  it('says so when there is nobody to send to', async () => {
    const l = await lead('noa@acme.com')
    await notifyTeamOfNewLead(l.id)
    expect(sent).toHaveLength(0)
    expect(JSON.stringify((await alertLog('lead.alert_skipped'))[0]?.metadata)).toContain('no active admins')
  })

  it('never throws when the email service fails, and records the reason', async () => {
    await allow('ann@igani.co', 'ADMIN')
    failWith = 'domain is not verified'
    const l = await lead('noa@acme.com')
    await expect(notifyTeamOfNewLead(l.id)).resolves.toBeUndefined()
    expect(JSON.stringify((await alertLog('lead.alert_failed'))[0]?.metadata)).toContain('domain is not verified')
  })
})
