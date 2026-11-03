import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
Object.assign(process.env, { NEXTAUTH_SECRET: 'test-secret-test-secret-test-secret', NEXT_PUBLIC_APP_URL: 'https://app.igani.co' })

const d = testDb ? describe : describe.skip

d('offer tracking endpoint', async () => {
  const { POST } = await import('@/app/api/public/offers/[slug]/track/route')
  const prisma = new PrismaClient()
  let leadId = ''
  beforeEach(async () => {
    await prisma.offerVisit.deleteMany()
    await prisma.offer.deleteMany()
    await prisma.lead.deleteMany()
    leadId = (await prisma.lead.create({ data: { email: 'c@x.com' } })).id
  })
  afterAll(async () => prisma.$disconnect())

  const body = (over: object = {}) => ({ key: 'k-0123456789abcdef', visitorId: 'v-0123456789abcdef', device: 'desktop', vw: 1280, vh: 800, durationMs: 4000, maxScroll: 30, sections: { overview: 3000 }, clicks: [{ s: 'sign', x: 0.4, y: 0.6, t: 900, l: 'Sign' }], moves: [], ...over })
  const send = (slug: string, b: unknown, ip = '1.2.3.4') => POST(new Request(`http://x/api/public/offers/${slug}/track`, { method: 'POST', body: typeof b === 'string' ? b : JSON.stringify(b), headers: { 'x-forwarded-for': ip } }), { params: Promise.resolve({ slug }) })

  it('records a visit on a live offer and folds later batches into it', async () => {
    await prisma.offer.create({ data: { slug: 'live-one', leadId, title: 'x', status: 'LIVE' } })
    expect((await send('live-one', body())).status).toBe(204)
    expect((await send('live-one', body({ durationMs: 9000, maxScroll: 90, clicks: [] }))).status).toBe(204)
    const rows = await prisma.offerVisit.findMany()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ durationMs: 9000, maxScrollPct: 90, device: 'desktop' })
    expect(rows[0]!.clicks).toHaveLength(1)
    expect(rows[0]!.ipHash).not.toContain('1.2.3.4')
  })

  it('ignores drafts, unknown offers and junk', async () => {
    await prisma.offer.create({ data: { slug: 'draft-one', leadId, title: 'x', status: 'DRAFT' } })
    expect((await send('draft-one', body())).status).toBe(204)
    expect((await send('nope', body())).status).toBe(204)
    expect((await send('draft-one', '{not json')).status).toBe(400)
    expect((await send('draft-one', { ...body(), device: 'fridge' })).status).toBe(400)
    expect((await send('draft-one', 'x'.repeat(60_000))).status).toBe(400)
    expect(await prisma.offerVisit.count()).toBe(0)
  })

  it('another IP cannot write into someone else’s visit', async () => {
    await prisma.offer.create({ data: { slug: 'live-two', leadId, title: 'x', status: 'LIVE' } })
    await send('live-two', body())
    await send('live-two', body({ durationMs: 999_999, maxScroll: 100 }), '9.9.9.9')
    expect(await prisma.offerVisit.findFirstOrThrow()).toMatchObject({ durationMs: 4000, maxScrollPct: 30 })
  })

  it('skips empty bounces and caps new visits per IP', async () => {
    await prisma.offer.create({ data: { slug: 'live-three', leadId, title: 'x', status: 'LIVE' } })
    await send('live-three', body({ key: 'k-empty-0000000000', durationMs: 200, maxScroll: 0, sections: {}, clicks: [] }))
    expect(await prisma.offerVisit.count()).toBe(0)
    for (let i = 0; i < 45; i++) await send('live-three', body({ key: `k-flood-${String(i).padStart(12, '0')}` }))
    expect(await prisma.offerVisit.count()).toBe(40)
  })
})
