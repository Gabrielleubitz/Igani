import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb

// who may use the room is the presence rule (tested with presence); here: room "abc" with token "ok" only
const room = { id: '' }
vi.mock('@/lib/meet-presence', () => ({ roomForPresence: async (code: string, t: string | null) => (code === 'abc' && t === 'ok' ? { id: room.id, avatar: null } : null) }))

const d = testDb ? describe : describe.skip

d('Meet reactions through the CRM', async () => {
  const route = await import('@/app/api/public/meet/[code]/reactions/route')
  const prisma = new PrismaClient()
  const params = (code = 'abc') => ({ params: Promise.resolve({ code }) })
  const post = (body: object, code = 'abc') => route.POST(new Request('https://app.igani.co/x', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }), params(code))
  const get = async (q: string, code = 'abc') => route.GET(new Request(`https://app.igani.co/x?${q}`), params(code))

  beforeEach(async () => {
    await prisma.meetReaction.deleteMany()
    await prisma.meetRoom.deleteMany({ where: { code: 'abc' } })
    room.id = (await prisma.meetRoom.create({ data: { code: 'abc', title: 'Test call' } })).id
  })
  afterAll(async () => {
    await prisma.meetRoom.deleteMany({ where: { code: 'abc' } })
    await prisma.$disconnect()
  })

  it('relays a reaction to everyone in the call, with its id and sender tab', async () => {
    const before = Date.now() - 1
    expect((await post({ t: 'ok', id: 'reaction00001', key: 'tabaaaaaaaa1', name: 'Dana', emoji: '👍' })).status).toBe(200)
    // sent twice (a retry): stored once
    await post({ t: 'ok', id: 'reaction00001', key: 'tabaaaaaaaa1', name: 'Dana', emoji: '👍' })
    const res = await get(`t=ok&since=${before}`)
    const body = (await res.json()) as { reactions: { id: string; key: string; name: string; emoji: string }[] }
    expect(body.reactions).toEqual([expect.objectContaining({ id: 'reaction00001', key: 'tabaaaaaaaa1', name: 'Dana', emoji: '👍' })])
    // nothing newer after it
    expect(((await (await get(`t=ok&since=${Date.now() + 1000}`)).json()) as { reactions: unknown[] }).reactions).toEqual([])
  })

  it('refuses people who may not join, unknown emoji and bursts', async () => {
    expect((await post({ t: 'wrong', id: 'reaction00002', key: 'tabaaaaaaaa1', name: 'X', emoji: '👍' })).status).toBe(404)
    expect((await get('t=wrong')).status).toBe(404)
    expect((await post({ t: 'ok', id: 'reaction00003', key: 'tabaaaaaaaa1', name: 'X', emoji: '💩' })).status).toBe(400)
    for (let i = 0; i < 10; i++) await post({ t: 'ok', id: `burst0000${String(i).padStart(3, '0')}`, key: 'tabbbbbbbbb2', name: 'X', emoji: '🎉' })
    expect((await post({ t: 'ok', id: 'burst0000999', key: 'tabbbbbbbbb2', name: 'X', emoji: '🎉' })).status).toBe(429)
  })
})
