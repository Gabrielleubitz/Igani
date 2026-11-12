/**
 * The web notifier's query (chatNewestFor) against a real, disposable Postgres: which unread messages reach a person.
 * Only runs when TEST_DATABASE_URL is set (it wipes the chat tables).
 */
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
const d = testDb ? describe : describe.skip

d('newest chat messages for a person', async () => {
  const { chatNewestFor } = await import('@/lib/chat')
  const prisma = new PrismaClient()
  let me = ''
  let dana = ''
  let general = ''
  let dm = ''
  const long = new Date(Date.now() - 60_000)

  beforeEach(async () => {
    await prisma.chatMessage.deleteMany()
    await prisma.chatMember.deleteMany()
    await prisma.chatChannel.deleteMany()
    await prisma.user.deleteMany({ where: { email: { in: ['me@igani.co', 'dana@igani.co'] } } })
    me = (await prisma.user.create({ data: { email: 'me@igani.co', name: 'Me', role: 'SALES' } })).id
    dana = (await prisma.user.create({ data: { email: 'dana@igani.co', name: 'Dana', role: 'SALES' } })).id
    general = (
      await prisma.chatChannel.create({
        data: {
          kind: 'CHANNEL',
          name: 'general',
          members: {
            create: [
              { userId: me, lastReadAt: long },
              { userId: dana, lastReadAt: long },
            ],
          },
        },
      })
    ).id
    dm = (
      await prisma.chatChannel.create({
        data: {
          kind: 'DM',
          dmKey: [me, dana].sort().join(':'),
          private: true,
          members: {
            create: [
              { userId: me, lastReadAt: long },
              { userId: dana, lastReadAt: long },
            ],
          },
        },
      })
    ).id
  })
  afterAll(async () => prisma.$disconnect())

  const say = (channelId: string, userId: string, body: string, extra: { parentId?: string; createdAt?: Date; deletedAt?: Date } = {}) => prisma.chatMessage.create({ data: { channelId, userId, body, ...extra } })
  const reasons = async () => (await chatNewestFor(me)).map((r) => [r.body, r.reason])

  it('finds direct messages, channel messages and mentions, newest first, with why', async () => {
    await say(general, dana, 'morning all', { createdAt: new Date(Date.now() - 3000) })
    await say(dm, dana, 'got a sec?', { createdAt: new Date(Date.now() - 2000) })
    await say(general, dana, `<@${me}> see this`, { createdAt: new Date(Date.now() - 1000) })
    expect(await reasons()).toEqual([
      [`<@${me}> see this`, 'mention'],
      ['got a sec?', 'dm'],
      ['morning all', 'channel'],
    ])
  })

  it('skips my own messages, deleted ones, and what I have already read', async () => {
    await say(general, me, 'mine')
    await say(general, dana, 'gone', { deletedAt: new Date() })
    await say(general, dana, 'old', { createdAt: new Date(Date.now() - 120_000) })
    expect(await reasons()).toEqual([])
  })

  it('a muted channel is quiet, except for mentions', async () => {
    await prisma.chatMember.update({ where: { channelId_userId: { channelId: general, userId: me } }, data: { muted: true } })
    await say(general, dana, 'chatter')
    await say(general, dana, `hey <@${me}>`)
    expect(await reasons()).toEqual([[`hey <@${me}>`, 'mention']])
  })

  it('thread replies reach me only in threads I started or replied in', async () => {
    const mine = await say(general, me, 'my thread', { createdAt: long })
    const theirs = await say(general, dana, 'their thread', { createdAt: long })
    const joined = await say(general, dana, 'a thread I joined', { createdAt: long })
    await say(general, me, 'me too', { parentId: joined.id, createdAt: long })
    await say(general, dana, 'reply to mine', { parentId: mine.id, createdAt: new Date(Date.now() - 2000) })
    await say(general, dana, 'reply to theirs', { parentId: theirs.id, createdAt: new Date(Date.now() - 1500) })
    await say(general, dana, 'reply where I joined', { parentId: joined.id, createdAt: new Date(Date.now() - 1000) })
    const rows = await chatNewestFor(me)
    expect(rows.map((r) => [r.body, r.reason, r.parentId])).toEqual([
      ['reply where I joined', 'thread', joined.id],
      ['reply to mine', 'thread', mine.id],
    ])
    expect(rows[0]!.channelId).toBe(general)
    expect(rows[0]!.kind).toBe('CHANNEL')
    expect(rows[0]!.name).toBe('general')
  })

  it('honours the limit and leaves archived channels alone', async () => {
    for (let i = 0; i < 7; i++) await say(general, dana, `m${i}`, { createdAt: new Date(Date.now() - 7000 + i * 1000) })
    expect((await chatNewestFor(me, 3)).map((r) => r.body)).toEqual(['m6', 'm5', 'm4'])
    await prisma.chatChannel.update({ where: { id: general }, data: { archivedAt: new Date() } })
    expect(await chatNewestFor(me)).toEqual([])
  })
})
