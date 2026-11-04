import { readdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
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
  CRON_SECRET: 'cron-secret-cron-secret',
})

const d = testDb ? describe : describe.skip
const outbox = join(process.cwd(), '.email-outbox')

d('weekly summary email', async () => {
  const { GET } = await import('@/app/api/public/cron/weekly-summary/route')
  const { weekKey } = await import('@/lib/weekly-summary')
  const prisma = new PrismaClient()
  const call = (q = '', auth = 'Bearer cron-secret-cron-secret') => GET(new Request(`https://app.igani.co/api/public/cron/weekly-summary${q}`, { headers: { authorization: auth } }))
  beforeEach(async () => {
    vi.stubEnv('EMAIL_DRY_RUN', '1') // emails are written to .email-outbox/, never sent
    rmSync(outbox, { recursive: true, force: true })
    // other DB test files share this database: clear anything that points at users or leads first
    await prisma.booking.deleteMany()
    await prisma.leadDocument.deleteMany()
    await prisma.offerVisit.deleteMany()
    await prisma.offer.deleteMany()
    await prisma.activityLog.deleteMany()
    await prisma.siteSetting.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.allowedUser.deleteMany()
    await prisma.user.deleteMany()
    await prisma.allowedUser.create({ data: { email: 'boss@igani.co', role: 'ADMIN' } })
    await prisma.allowedUser.create({ data: { email: 'rep@igani.co', role: 'SALES' } })
    await prisma.user.create({ data: { email: 'boss@igani.co', name: 'Gabriel L', role: 'ADMIN' } })
    const won = await prisma.lead.create({ data: { email: 'won@x.com', status: 'WON', quotedPrice: 18_500, source: 'igani.co' } })
    await prisma.activityLog.create({ data: { entityType: 'LEAD', entityId: won.id, action: 'lead.status_changed', actorId: null, metadata: { from: 'SIGNED', to: 'WON' } } })
    await prisma.lead.create({ data: { email: 'new@x.com', source: 'igani.co' } })
    const reading = await prisma.lead.create({ data: { email: 'reading@x.com', company: 'Honey Ltd', status: 'PROPOSAL_SENT', quotedPrice: 30_000 } })
    const offer = await prisma.offer.create({ data: { slug: 'honey', leadId: reading.id, title: 'Honey site', status: 'LIVE' } })
    for (const [i, v] of ['v-aaaaaaaaaaaaaaaa', 'v-aaaaaaaaaaaaaaaa', 'v-bbbbbbbbbbbbbbbb'].entries()) {
      await prisma.offerVisit.create({ data: { offerId: offer.id, key: `k-${i}-cccccccccccccccc`, visitorId: v, device: 'desktop', viewportW: 1280, viewportH: 800, ipHash: 'h', maxScrollPct: 60 + i * 10, startedAt: new Date(Date.now() - 3600_000) } })
    }
  })
  afterAll(async () => {
    vi.unstubAllEnvs()
    rmSync(outbox, { recursive: true, force: true })
    await prisma.$disconnect()
  })

  it('needs the cron secret', async () => {
    expect((await call('', 'Bearer nope')).status).toBe(401)
  })

  it('counts the week and lists offers clients are reading', async () => {
    const res = await (await call('?dry=1')).json()
    expect(res.summary).toMatchObject({ newLeads: 3, won: { count: 1, value: 18_500 }, openDeals: 2, pipelineValue: 30_000 })
    expect(res.summary.hotOffers[0]).toMatchObject({ client: 'Honey Ltd', visits: 3, people: 2, avgRead: 70 })
  })

  it('emails each admin once per week, and not at all when turned off', async () => {
    const first = await (await call()).json()
    expect(first).toMatchObject({ ok: true, sent: 1, week: weekKey(new Date()) })
    const html = readFileSync(join(outbox, readdirSync(outbox)[0]!), 'utf8')
    expect(html).toContain('to: boss@igani.co')
    expect(html).toContain('Your week at Igani, Gabriel')
    expect(html).toContain('Honey Ltd')
    // a second run straight away (e.g. Cron retried) sends nothing
    expect((await (await call()).json()).skipped).toMatch(/moments ago/)
    expect(readdirSync(outbox)).toHaveLength(1)
    // much later, a rerun still only reaches admins the first run missed (none here)
    await prisma.siteSetting.update({ where: { key: `weekly-summary:${weekKey(new Date())}` }, data: { updatedAt: new Date(Date.now() - 3600_000) } })
    expect((await (await call()).json()).skipped).toMatch(/already sent/)
    expect(readdirSync(outbox)).toHaveLength(1)
    await prisma.siteSetting.deleteMany()
    await prisma.siteSetting.create({ data: { key: 'notifications.weeklySummary', value: false } })
    expect((await (await call()).json()).skipped).toMatch(/turned off/)
  })
})
