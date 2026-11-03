import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
Object.assign(process.env, { NEXTAUTH_SECRET: 'test-secret-test-secret-test-secret', NEXT_PUBLIC_APP_URL: 'https://app.igani.co' })

const d = testDb ? describe : describe.skip

d('website tracking endpoint', async () => {
  const { POST } = await import('@/app/api/public/site/track/route')
  const { siteSectionLabel } = await import('@/lib/site-pages')
  const prisma = new PrismaClient()
  beforeEach(async () => {
    await prisma.siteVisit.deleteMany()
    await prisma.siteSetting.deleteMany({ where: { key: 'website.tracking' } })
  })
  afterAll(async () => prisma.$disconnect())

  const body = (over: object = {}) => ({ page: 'home', key: 'k-0123456789abcdef', visitorId: 'v-0123456789abcdef', device: 'phone', vw: 390, vh: 844, durationMs: 4000, maxScroll: 55, sections: { hero: 3000 }, clicks: [{ s: 'sheet-contact', x: 0.5, y: 0.5, t: 100, l: 'Send' }], moves: [], utmSource: 'google', ...over })
  const send = (b: unknown, origin = 'https://igani.co') =>
    POST(new Request('https://app.igani.co/api/public/site/track', { method: 'POST', body: JSON.stringify(b), headers: { origin, 'content-type': 'text/plain', 'x-forwarded-for': '5.5.5.5' } }))

  it('records visits from igani.co and folds batches together', async () => {
    expect((await send(body())).status).toBe(204)
    await send(body({ durationMs: 8000, maxScroll: 90 }))
    const rows = await prisma.siteVisit.findMany()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ page: 'home', device: 'phone', durationMs: 8000, maxScrollPct: 90, utmSource: 'google' })
  })

  it('drops other origins, unknown pages and bad bodies', async () => {
    await send(body(), 'https://evil.example')
    await send(body(), 'null')
    expect((await send(body({ page: 'admin' }))).status).toBe(400)
    expect((await send({ ...body(), clicks: 'x' })).status).toBe(400)
    expect(await prisma.siteVisit.count()).toBe(0)
  })

  it('stops recording a page when it is switched off in the CRM', async () => {
    await prisma.siteSetting.create({ data: { key: 'website.tracking', value: { home: false, realestate: true } } })
    await send(body())
    await send(body({ page: 'realestate', key: 'k-re-0123456789abc' }))
    expect((await prisma.siteVisit.findMany()).map((r) => r.page)).toEqual(['realestate'])
  })

  it('names sections the way the pages do', () => {
    expect(siteSectionLabel('sheet-build-what')).toBe('What we build')
    expect(siteSectionLabel('sheet-new-thing')).toBe('New thing')
  })
})
