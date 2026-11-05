import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
Object.assign(process.env, { NEXTAUTH_SECRET: 'test-secret-test-secret-test-secret', NEXT_PUBLIC_APP_URL: 'https://app.igani.co' })
for (const k of ['JAAS_APP_ID', 'JAAS_KEY_ID', 'JAAS_PRIVATE_KEY']) delete process.env[k]

vi.mock('next/cache', () => ({ revalidatePath: () => undefined }))
const session = { user: null as null | { id: string; email: string; role: 'ADMIN' | 'SALES'; name: string | null } }
vi.mock('@/lib/auth', async (orig) => ({ ...(await orig<typeof import('@/lib/auth')>()), requireUser: async () => session.user, currentUserOrNull: async () => session.user }))
// no email leaves the test: each invite is recorded, one address fails on purpose
const sent: { to: string; joinUrl: string; start: Date | null }[] = []
vi.mock('@/lib/email', () => ({
  sendMeetInviteEmail: async (a: { to: string; joinUrl: string; start: Date | null }) => {
    if (a.to === 'bounce@nowhere.org') throw new Error('rejected')
    sent.push(a)
    return 'id'
  },
}))

const d = testDb ? describe : describe.skip

d('Igani Meet rooms and invites', async () => {
  const { addMeetInvites, createMeetRoom, endMeetRoom, joinMeet, removeMeetInvite } = await import('@/app/actions/meet')
  const prisma = new PrismaClient()
  let adminId = ''
  let repId = ''
  const asAdmin = () => (session.user = { id: adminId, email: 'boss@igani.co', role: 'ADMIN', name: 'Gabriel' })

  beforeEach(async () => {
    sent.length = 0
    await prisma.meetRoom.deleteMany()
    await prisma.user.deleteMany()
    adminId = (await prisma.user.create({ data: { email: 'boss@igani.co', name: 'Gabriel', role: 'ADMIN', timeZone: 'Asia/Jerusalem' } })).id
    repId = (await prisma.user.create({ data: { email: 'rita@igani.co', name: 'Rita', role: 'SALES' } })).id
    asAdmin()
  })
  afterAll(async () => {
    await prisma.meetRoom.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  it('invites teammates and outside emails, each with a personal link, and reports emails that failed', async () => {
    const r = await createMeetRoom({ title: 'Demo with Dana', when: '2026-11-08T10:00', durationMin: 45, userIds: [repId], emails: 'Dana Levi <dana@client.com>, RITA@igani.co, bounce@nowhere.org, boss@igani.co' })
    expect(r).toMatchObject({ ok: true, data: { sent: 2, failed: 1 } })
    const room = await prisma.meetRoom.findFirstOrThrow({ include: { invites: { orderBy: { email: 'asc' } } } })
    // 10:00 in Israel (UTC+2 in November)
    expect(room.scheduledAt?.toISOString()).toBe('2026-11-08T08:00:00.000Z')
    // the host isn't invited to their own call; Rita only once, linked to her account
    expect(room.invites.map((i) => [i.email, i.name, Boolean(i.userId), Boolean(i.sentAt), Boolean(i.sendError)])).toEqual([
      ['bounce@nowhere.org', null, false, false, true],
      ['dana@client.com', 'Dana Levi', false, true, false],
      ['rita@igani.co', 'Rita', true, true, false],
    ])
    const dana = room.invites.find((i) => i.email === 'dana@client.com')!
    expect(sent.find((s) => s.to === 'dana@client.com')!.joinUrl).toBe(`https://app.igani.co/meet/${room.code}?t=${encodeURIComponent(dana.token)}`)
    // adding the same people again does nothing
    expect(await addMeetInvites({ roomId: room.id, emails: 'dana@client.com', userIds: [repId] })).toMatchObject({ ok: false })
    expect(await addMeetInvites({ roomId: room.id, emails: 'new@else.io' })).toMatchObject({ ok: true, data: { added: 1, sent: 1 } })
  })

  it('lets in only people with a valid way in, as guest or host, until the call ends', async () => {
    const r = await createMeetRoom({ title: 'Quick call', emails: 'guest@client.com' })
    if (!r.ok) throw new Error(r.error)
    const room = await prisma.meetRoom.findUniqueOrThrow({ where: { code: r.data.code }, include: { invites: true } })
    const token = room.invites[0]!.token

    session.user = null
    const guest = await joinMeet({ code: room.code, token, name: 'Dana from Client' })
    expect(guest).toMatchObject({ ok: true, data: { name: 'Dana from Client', config: { domain: 'meet.jit.si', roomName: room.code } } })
    expect(await prisma.meetInvite.findUniqueOrThrow({ where: { token } })).toMatchObject({ name: 'Dana from Client' })
    expect((await prisma.meetInvite.findUniqueOrThrow({ where: { token } })).joinedAt).not.toBeNull()
    expect(await joinMeet({ code: room.code, token: null, name: 'Stranger' })).toMatchObject({ ok: false, error: expect.stringMatching(/invite link/) })
    expect(await joinMeet({ code: room.code, token: 'wrong-token', name: 'x' })).toMatchObject({ ok: false })
    // a teammate who wasn't invited can't walk in; the admin host can, under their own name
    session.user = { id: repId, email: 'rita@igani.co', role: 'SALES', name: 'Rita' }
    expect(await joinMeet({ code: room.code, token: null, name: 'Rita' })).toMatchObject({ ok: false })
    asAdmin()
    expect(await joinMeet({ code: room.code, token: null, name: 'whatever' })).toMatchObject({ ok: true, data: { name: 'Gabriel' } })

    await removeMeetInvite(room.invites[0]!.id)
    session.user = null
    expect(await joinMeet({ code: room.code, token, name: 'Dana' })).toMatchObject({ ok: false })
    asAdmin()
    await endMeetRoom(room.id)
    expect(await joinMeet({ code: room.code, token: null, name: 'Gabriel' })).toMatchObject({ ok: false, error: expect.stringMatching(/ended/) })
  })
})
