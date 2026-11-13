import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
vi.mock('server-only', () => ({}))
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: () => undefined }))
vi.mock('@/lib/instagram', () => ({ token: async () => ({ token: 'tok', userId: 'me' }), instagramConfig: () => ({ id: 'app', secret: 's' }) }))
vi.mock('@/lib/reels', () => ({ listReels: async () => [{ id: 'reel-emu', title: 'The Great Emu War', caption: 'DM us "SYSTEM" and we’ll show you where yours is leaking.' }] }))
const pushes: string[] = []
vi.mock('@/lib/push', () => ({ pushLater: (_u: string[], _k: string, m: { title: string }) => void pushes.push(m.title) }))
vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ username: 'dana.bakes', name: 'Dana Levi', profile_pic: null })))

const d = testDb ? describe : describe.skip

d('Instagram DMs become leads', async () => {
  const dm = await import('@/lib/instagram-dm')
  const prisma = new PrismaClient()
  const hook = (mid: string, text: string, from = 'person-1', echo = false) => ({ object: 'instagram', entry: [{ id: 'me', messaging: [{ sender: { id: echo ? 'me' : from }, recipient: { id: echo ? from : 'me' }, timestamp: Date.now(), message: { mid, text, ...(echo ? { is_echo: true } : {}) } }] }] })

  beforeEach(async () => {
    pushes.length = 0
    await prisma.igMessage.deleteMany(); await prisma.igThread.deleteMany()
    await prisma.lead.deleteMany({ where: { source: 'instagram' } })
  })
  afterAll(async () => { await prisma.igMessage.deleteMany(); await prisma.igThread.deleteMany(); await prisma.lead.deleteMany({ where: { source: 'instagram' } }); await prisma.$disconnect() })

  it('the first DM opens a conversation and a lead tagged with the reel, and tells the admins', async () => {
    expect(await dm.handleWebhook(hook('m1', 'Hi! SYSTEM'))).toBe(1)
    const t = await prisma.igThread.findUniqueOrThrow({ where: { igsid: 'person-1' }, include: { lead: true, messages: true } })
    expect(t).toMatchObject({ username: 'dana.bakes', reelId: 'reel-emu', keyword: 'SYSTEM', unread: 1 })
    expect(t.lead).toMatchObject({ firstName: 'Dana', lastName: 'Levi', source: 'instagram', tags: ['instagram', 'reel:system'] })
    expect(t.lead!.sourceDetail).toContain('The Great Emu War')
    expect(pushes).toEqual(['New Instagram DM lead: @dana.bakes'])
  })
  it('ignores retries, adds later messages to the same conversation, and records our own replies once', async () => {
    await dm.handleWebhook(hook('m1', 'Hi! SYSTEM'))
    expect(await dm.handleWebhook(hook('m1', 'Hi! SYSTEM'))).toBe(0)
    await dm.handleWebhook(hook('m2', 'we sell cakes'))
    await dm.handleWebhook(hook('m3', 'Thanks Dana!', 'person-1', true))
    await dm.handleWebhook(hook('m3', 'Thanks Dana!', 'person-1', true))
    expect(await prisma.lead.count({ where: { source: 'instagram' } })).toBe(1)
    const msgs = await prisma.igMessage.findMany({ orderBy: { at: 'asc' } })
    expect(msgs.map((m) => [m.mid, m.fromUs])).toEqual([['m1', false], ['m2', false], ['m3', true]])
  })
})
