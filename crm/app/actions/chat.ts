'use server'

import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { avatarPath } from '@/lib/avatar'
import { CHAT_EMOJI, CHAT_MAX, canSeeChannel, channelSlug, chatTeam, chatUnreadFor, dmKeyFor, ensureGeneral, type ChatPerson } from '@/lib/chat'
import { prisma } from '@/lib/prisma'
import { toActionError, type ActionResult } from './result'

const id = z.string().regex(/^[a-z0-9]{20,40}$/i)
const NOT_FOUND = 'That conversation is gone or you are not in it.'

export interface ChatChannelRow {
  id: string
  kind: 'CHANNEL' | 'DM'
  /** channel name ("sales-floor"), or the other person's name for a direct conversation */
  name: string
  topic: string | null
  private: boolean
  member: boolean
  unread: number
  /** mentions of you, and every unread direct message */
  mentions: number
  lastMessageAt: string
  /** direct conversations: the other person */
  dm: { id: string; photo: string | null; role: string } | null
}

export interface ChatOverview {
  me: ChatPerson
  isAdmin: boolean
  channels: ChatChannelRow[]
  people: ChatPerson[]
}

export interface ChatReactionRow {
  emoji: string
  count: number
  mine: boolean
  names: string[]
}

export interface ChatMessageRow {
  id: string
  userId: string | null
  name: string
  photo: string | null
  body: string
  at: string
  edited: boolean
  deleted: boolean
  reactions: ChatReactionRow[]
}

export interface ChatChannelInfo {
  id: string
  kind: 'CHANNEL' | 'DM'
  name: string
  topic: string | null
  private: boolean
  member: boolean
  /** may rename, change the topic, add people and archive */
  canManage: boolean
  members: ChatPerson[]
  createdAt: string
}

export interface ChatPage {
  channel: ChatChannelInfo
  messages: ChatMessageRow[]
  /** older messages exist (load with before = the first message's time) */
  more: boolean
  /** pass back as `since` to get only what changed */
  cursor: string
  /** everyone's read position, for "seen by" in direct conversations */
  readBy: { userId: string; at: string }[]
}

async function userMap(ids: string[]): Promise<Map<string, { name: string; photo: string | null }>> {
  const users = await prisma.user.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, name: true, email: true, image: true } })
  return new Map(users.map((u) => [u.id, { name: u.name?.trim() || (u.email ?? '').split('@')[0] || 'Teammate', photo: avatarPath({ id: u.id, image: u.image }) }]))
}

async function loadChannel(channelId: string, userId: string) {
  const channel = await prisma.chatChannel.findUnique({ where: { id: channelId } })
  if (!channel || channel.archivedAt || !(await canSeeChannel(channel, userId))) return null
  return channel
}

/** Your channels and conversations with unread counts, plus the team (for new conversations and mentions). */
export async function chatOverview(): Promise<ActionResult<ChatOverview>> {
  try {
    const user = await requireUser()
    await ensureGeneral()
    const [people, channels, memberships, counts] = await Promise.all([
      chatTeam(),
      prisma.chatChannel.findMany({
        where: { archivedAt: null, OR: [{ kind: 'CHANNEL', private: false }, { members: { some: { userId: user.id } } }] },
        orderBy: { lastMessageAt: 'desc' },
        take: 300,
        include: { members: { select: { userId: true } } },
      }),
      prisma.chatMember.findMany({ where: { userId: user.id }, select: { channelId: true } }),
      prisma.$queryRaw<{ channelId: string; unread: number; mentions: number }[]>`
        SELECT m."channelId", count(*)::int AS unread,
               count(*) FILTER (WHERE strpos(m."body", ${`<@${user.id}>`}) > 0)::int AS mentions
        FROM "ChatMessage" m
        JOIN "ChatMember" cm ON cm."channelId" = m."channelId" AND cm."userId" = ${user.id}
        WHERE m."createdAt" > cm."lastReadAt" AND m."deletedAt" IS NULL AND (m."userId" IS NULL OR m."userId" <> ${user.id})
        GROUP BY m."channelId"`,
    ])
    const mine = new Set(memberships.map((m) => m.channelId))
    const count = new Map(counts.map((c) => [c.channelId, c]))
    const personBy = new Map(people.map((p) => [p.id, p]))
    const others = channels.filter((c) => c.kind === 'DM').map((c) => c.members.find((m) => m.userId !== user.id)?.userId ?? user.id)
    const extra = await userMap(others.filter((o) => !personBy.has(o)))
    const me = personBy.get(user.id) ?? { id: user.id, name: user.name ?? user.email, role: user.role, photo: null }
    const rows: ChatChannelRow[] = channels.map((c) => {
      const n = count.get(c.id)
      if (c.kind === 'DM') {
        const otherId = c.members.find((m) => m.userId !== user.id)?.userId ?? user.id
        const other = personBy.get(otherId) ?? (extra.get(otherId) ? { id: otherId, ...extra.get(otherId)!, role: 'SALES' as const } : null)
        return { id: c.id, kind: 'DM', name: otherId === user.id ? `${me.name} (you)` : (other?.name ?? 'Former teammate'), topic: null, private: true, member: true, unread: n?.unread ?? 0, mentions: n?.unread ?? 0, lastMessageAt: c.lastMessageAt.toISOString(), dm: { id: otherId, photo: other?.photo ?? null, role: other?.role ?? 'SALES' } }
      }
      return { id: c.id, kind: 'CHANNEL', name: c.name, topic: c.topic, private: c.private, member: mine.has(c.id), unread: n?.unread ?? 0, mentions: n?.mentions ?? 0, lastMessageAt: c.lastMessageAt.toISOString(), dm: null }
    })
    return { ok: true, data: { me, isAdmin: user.role === 'ADMIN', channels: rows, people } }
  } catch (err) {
    return toActionError(err)
  }
}

/** Total unread (channels you're in and direct messages), for the badge. */
export async function chatUnread(): Promise<ActionResult<{ unread: number; mentions: number }>> {
  try {
    const user = await requireUser()
    return { ok: true, data: await chatUnreadFor(user.id) }
  } catch (err) {
    return toActionError(err)
  }
}

const pageInput = z.object({ channelId: id, before: z.string().datetime().optional(), since: z.string().datetime().optional() })

/**
 * Messages in a channel, newest 60 (or the 60 before `before`). With `since`, only messages written, edited or deleted
 * after it (for polling), and the reactions of the latest messages.
 */
export async function chatMessages(input: z.input<typeof pageInput>): Promise<ActionResult<ChatPage>> {
  try {
    const user = await requireUser()
    const { channelId, before, since } = pageInput.parse(input)
    const channel = await loadChannel(channelId, user.id)
    if (!channel) return { ok: false, error: NOT_FOUND }
    const cursor = new Date().toISOString()
    const take = 60
    const changed = since ? new Date(since) : null
    const rows = changed
      ? await prisma.chatMessage.findMany({
          where: { channelId, OR: [{ createdAt: { gt: changed } }, { editedAt: { gt: changed } }, { deletedAt: { gt: changed } }] },
          orderBy: { createdAt: 'asc' },
          take: 200,
          include: { reactions: true },
        })
      : (
          await prisma.chatMessage.findMany({
            where: { channelId, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
            orderBy: { createdAt: 'desc' },
            take: take + 1,
            include: { reactions: true },
          })
        ).reverse()
    const more = !changed && rows.length > take
    const list = more ? rows.slice(1) : rows
    // polling: also refresh reactions on the latest messages (reacting doesn't change the message itself)
    const recent = changed ? await prisma.chatMessage.findMany({ where: { channelId, deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 40, include: { reactions: true } }) : []
    const all = [...list, ...recent.filter((r) => !list.some((l) => l.id === r.id)).map((r) => ({ ...r, reactionsOnly: true }))]
    const [members, people] = await Promise.all([prisma.chatMember.findMany({ where: { channelId }, select: { userId: true, lastReadAt: true } }), userMap([...all.map((m) => m.userId ?? ''), ...all.flatMap((m) => m.reactions.map((r) => r.userId))].filter(Boolean))])
    const memberIds = members.map((m) => m.userId)
    const team = await chatTeam()
    const teamBy = new Map(team.map((p) => [p.id, p]))
    const isMember = memberIds.includes(user.id)
    const otherId = channel.kind === 'DM' ? (memberIds.find((m) => m !== user.id) ?? user.id) : null
    const otherName = otherId ? (teamBy.get(otherId)?.name ?? (await userMap([otherId])).get(otherId)?.name ?? 'Former teammate') : ''
    const messages: ChatMessageRow[] = all.map((m) => {
      const who = m.userId ? people.get(m.userId) : null
      const grouped = new Map<string, string[]>()
      for (const r of m.reactions) grouped.set(r.emoji, [...(grouped.get(r.emoji) ?? []), r.userId])
      return {
        id: m.id,
        userId: m.userId,
        name: who?.name ?? 'Former teammate',
        photo: who?.photo ?? null,
        body: m.deletedAt ? '' : m.body,
        at: m.createdAt.toISOString(),
        edited: Boolean(m.editedAt && !m.deletedAt),
        deleted: Boolean(m.deletedAt),
        reactions: [...grouped].map(([emoji, ids]) => ({ emoji, count: ids.length, mine: ids.includes(user.id), names: ids.map((i) => (i === user.id ? 'You' : (people.get(i)?.name ?? 'Someone'))) })),
      }
    })
    return {
      ok: true,
      data: {
        channel: {
          id: channel.id,
          kind: channel.kind,
          name: channel.kind === 'DM' ? (otherId === user.id ? 'Notes to self' : otherName) : channel.name,
          topic: channel.topic,
          private: channel.private,
          member: isMember || channel.kind === 'DM',
          canManage: channel.kind === 'CHANNEL' && (user.role === 'ADMIN' || channel.createdById === user.id),
          members: memberIds.map((m) => teamBy.get(m)).filter((p): p is ChatPerson => Boolean(p)),
          createdAt: channel.createdAt.toISOString(),
        },
        messages,
        more,
        cursor,
        readBy: members.filter((m) => m.userId !== user.id).map((m) => ({ userId: m.userId, at: m.lastReadAt.toISOString() })),
      },
    }
  } catch (err) {
    return toActionError(err)
  }
}

const sendInput = z.object({ channelId: id, body: z.string().trim().min(1, 'Write something first.').max(CHAT_MAX, `Keep it under ${CHAT_MAX} characters.`) })

/** Post a message (joining a public channel as you do) and mark the channel read. */
export async function chatSend(input: z.input<typeof sendInput>): Promise<ActionResult<{ id: string; at: string }>> {
  try {
    const user = await requireUser()
    const { channelId, body } = sendInput.parse(input)
    const channel = await loadChannel(channelId, user.id)
    if (!channel) return { ok: false, error: NOT_FOUND }
    const now = new Date()
    const msg = await prisma.$transaction(async (tx) => {
      const m = await tx.chatMessage.create({ data: { channelId, userId: user.id, body, createdAt: now } })
      await tx.chatChannel.update({ where: { id: channelId }, data: { lastMessageAt: now } })
      await tx.chatMember.upsert({ where: { channelId_userId: { channelId, userId: user.id } }, create: { channelId, userId: user.id, lastReadAt: now }, update: { lastReadAt: now } })
      return m
    })
    return { ok: true, data: { id: msg.id, at: msg.createdAt.toISOString() } }
  } catch (err) {
    return toActionError(err)
  }
}

const editInput = z.object({ messageId: id, body: z.string().trim().min(1).max(CHAT_MAX) })

/** Edit your own message. */
export async function chatEdit(input: z.input<typeof editInput>): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const { messageId, body } = editInput.parse(input)
    const done = await prisma.chatMessage.updateMany({ where: { id: messageId, userId: user.id, deletedAt: null }, data: { body, editedAt: new Date() } })
    return done.count ? { ok: true, data: undefined } : { ok: false, error: 'You can only edit your own messages.' }
  } catch (err) {
    return toActionError(err)
  }
}

/** Delete your own message (admins can delete anyone's). It shows as "message deleted". */
export async function chatDelete(messageId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const mid = id.parse(messageId)
    const done = await prisma.chatMessage.updateMany({ where: { id: mid, deletedAt: null, ...(user.role === 'ADMIN' ? {} : { userId: user.id }) }, data: { deletedAt: new Date(), body: '' } })
    if (done.count) await prisma.chatReaction.deleteMany({ where: { messageId: mid } })
    return done.count ? { ok: true, data: undefined } : { ok: false, error: 'You can only delete your own messages.' }
  } catch (err) {
    return toActionError(err)
  }
}

const reactInput = z.object({ messageId: id, emoji: z.enum(CHAT_EMOJI) })

/** Add or take back a reaction. */
export async function chatReact(input: z.input<typeof reactInput>): Promise<ActionResult<{ on: boolean }>> {
  try {
    const user = await requireUser()
    const { messageId, emoji } = reactInput.parse(input)
    const msg = await prisma.chatMessage.findUnique({ where: { id: messageId }, include: { channel: true } })
    if (!msg || msg.deletedAt || msg.channel.archivedAt || !(await canSeeChannel(msg.channel, user.id))) return { ok: false, error: NOT_FOUND }
    const key = { messageId_userId_emoji: { messageId, userId: user.id, emoji } }
    const had = await prisma.chatReaction.findUnique({ where: key })
    if (had) await prisma.chatReaction.delete({ where: key })
    else await prisma.chatReaction.create({ data: { messageId, userId: user.id, emoji } })
    return { ok: true, data: { on: !had } }
  } catch (err) {
    return toActionError(err)
  }
}

/** Everything in this channel is read (only for channels you're in). */
export async function chatMarkRead(channelId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await prisma.chatMember.updateMany({ where: { channelId: id.parse(channelId), userId: user.id }, data: { lastReadAt: new Date() } })
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

const createInput = z.object({
  name: z.string().trim().min(1, 'Give the channel a name.').max(60),
  topic: z.string().trim().max(200).optional().nullable(),
  private: z.boolean().default(false),
  memberIds: z.array(id).max(100).default([]),
})

/** A new channel. You're in it, with anyone you add (private channels are seen only by their members). */
export async function chatCreateChannel(input: z.input<typeof createInput>): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    const v = createInput.parse(input)
    const name = channelSlug(v.name)
    if (!name) return { ok: false, error: 'Use letters or numbers in the name.' }
    const taken = await prisma.chatChannel.findFirst({ where: { kind: 'CHANNEL', name, archivedAt: null }, select: { id: true } })
    if (taken) return { ok: false, error: `There is already a #${name} channel.` }
    const team = new Set((await chatTeam()).map((p) => p.id))
    const members = [...new Set([user.id, ...v.memberIds.filter((m) => team.has(m))])]
    const ch = await prisma.chatChannel.create({ data: { kind: 'CHANNEL', name, topic: v.topic || null, private: v.private, createdById: user.id, members: { create: members.map((userId) => ({ userId })) } } })
    return { ok: true, data: { id: ch.id } }
  } catch (err) {
    return toActionError(err)
  }
}

const updateInput = z.object({ channelId: id, name: z.string().trim().min(1).max(60).optional(), topic: z.string().trim().max(200).nullable().optional() })

/** Rename a channel or change its topic (whoever made it, or an admin). */
export async function chatUpdateChannel(input: z.input<typeof updateInput>): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const v = updateInput.parse(input)
    const ch = await loadChannel(v.channelId, user.id)
    if (!ch || ch.kind !== 'CHANNEL') return { ok: false, error: NOT_FOUND }
    if (user.role !== 'ADMIN' && ch.createdById !== user.id) return { ok: false, error: 'Only whoever made this channel, or an admin, can change it.' }
    const name = v.name !== undefined ? channelSlug(v.name) : undefined
    if (name !== undefined && !name) return { ok: false, error: 'Use letters or numbers in the name.' }
    if (name && name !== ch.name && (await prisma.chatChannel.findFirst({ where: { kind: 'CHANNEL', name, archivedAt: null, id: { not: ch.id } }, select: { id: true } }))) return { ok: false, error: `There is already a #${name} channel.` }
    await prisma.chatChannel.update({ where: { id: ch.id }, data: { ...(name ? { name } : {}), ...(v.topic !== undefined ? { topic: v.topic || null } : {}) } })
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Archive a channel: it disappears for everyone (whoever made it, or an admin). #general stays. */
export async function chatArchiveChannel(channelId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const ch = await loadChannel(id.parse(channelId), user.id)
    if (!ch || ch.kind !== 'CHANNEL') return { ok: false, error: NOT_FOUND }
    if (ch.name === 'general') return { ok: false, error: '#general stays: it is where the whole team talks.' }
    if (user.role !== 'ADMIN' && ch.createdById !== user.id) return { ok: false, error: 'Only whoever made this channel, or an admin, can archive it.' }
    await prisma.chatChannel.update({ where: { id: ch.id }, data: { archivedAt: new Date() } })
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

const addInput = z.object({ channelId: id, userIds: z.array(id).min(1).max(100) })

/** Add teammates to a channel (anyone in a private channel can add people; anyone can add people to a public one). */
export async function chatAddMembers(input: z.input<typeof addInput>): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const v = addInput.parse(input)
    const ch = await loadChannel(v.channelId, user.id)
    if (!ch || ch.kind !== 'CHANNEL') return { ok: false, error: NOT_FOUND }
    const team = new Set((await chatTeam()).map((p) => p.id))
    const ids = v.userIds.filter((u) => team.has(u))
    await prisma.chatMember.createMany({ data: ids.map((userId) => ({ channelId: ch.id, userId, lastReadAt: new Date(0) })), skipDuplicates: true })
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Join a public channel (start getting its unread counts). */
export async function chatJoin(channelId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const ch = await loadChannel(id.parse(channelId), user.id)
    if (!ch || ch.kind !== 'CHANNEL') return { ok: false, error: NOT_FOUND }
    await prisma.chatMember.upsert({ where: { channelId_userId: { channelId: ch.id, userId: user.id } }, create: { channelId: ch.id, userId: user.id }, update: {} })
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Leave a channel (you can rejoin a public one; a private one needs someone to add you back). */
export async function chatLeave(channelId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const cid = id.parse(channelId)
    const ch = await prisma.chatChannel.findUnique({ where: { id: cid }, select: { kind: true } })
    if (!ch || ch.kind !== 'CHANNEL') return { ok: false, error: NOT_FOUND }
    await prisma.chatMember.deleteMany({ where: { channelId: cid, userId: user.id } })
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** The direct conversation with a teammate (made the first time). */
export async function chatOpenDm(userId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    const other = id.parse(userId)
    if (other !== user.id && !(await chatTeam()).some((p) => p.id === other)) return { ok: false, error: 'That person is not on the team.' }
    const dmKey = dmKeyFor(user.id, other)
    const found = await prisma.chatChannel.findUnique({ where: { dmKey }, select: { id: true } })
    if (found) return { ok: true, data: found }
    const ch = await prisma.chatChannel
      .create({ data: { kind: 'DM', private: true, dmKey, createdById: user.id, members: { create: [...new Set([user.id, other])].map((u) => ({ userId: u })) } } })
      .catch(async () => prisma.chatChannel.findUniqueOrThrow({ where: { dmKey } })) // both opened it at the same moment
    return { ok: true, data: { id: ch.id } }
  } catch (err) {
    return toActionError(err)
  }
}

export interface ChatPulse {
  unread: number
  mentions: number
  /** the newest unread direct message or mention of you */
  latest: { id: string; channelId: string; where: string; from: string; photo: string | null; preview: string; at: string } | null
}

/** For the notifier on every page: unread counts and the newest message that's for you. */
export async function chatPulse(): Promise<ActionResult<ChatPulse>> {
  try {
    const user = await requireUser()
    const counts = await chatUnreadFor(user.id)
    if (!counts.mentions) return { ok: true, data: { ...counts, latest: null } }
    const [m] = await prisma.$queryRaw<{ id: string; channelId: string; userId: string | null; body: string; createdAt: Date; kind: 'CHANNEL' | 'DM'; name: string }[]>`
      SELECT m."id", m."channelId", m."userId", m."body", m."createdAt", c."kind", c."name"
      FROM "ChatMessage" m
      JOIN "ChatMember" cm ON cm."channelId" = m."channelId" AND cm."userId" = ${user.id}
      JOIN "ChatChannel" c ON c."id" = m."channelId" AND c."archivedAt" IS NULL
      WHERE m."createdAt" > cm."lastReadAt" AND m."deletedAt" IS NULL AND (m."userId" IS NULL OR m."userId" <> ${user.id})
        AND (c."kind" = 'DM' OR strpos(m."body", ${`<@${user.id}>`}) > 0)
      ORDER BY m."createdAt" DESC LIMIT 1`
    if (!m) return { ok: true, data: { ...counts, latest: null } }
    const ids = [m.userId, ...[...m.body.matchAll(/<@([a-z0-9]{20,40})>/gi)].map((x) => x[1]!)].filter((x): x is string => Boolean(x))
    const people = await userMap(ids)
    const preview = m.body.replace(/<@([a-z0-9]{20,40})>/gi, (_, id: string) => `@${people.get(id)?.name ?? 'someone'}`).slice(0, 140)
    const who = m.userId ? people.get(m.userId) : null
    return { ok: true, data: { ...counts, latest: { id: m.id, channelId: m.channelId, where: m.kind === 'DM' ? 'Direct message' : `#${m.name}`, from: who?.name ?? 'Someone', photo: who?.photo ?? null, preview, at: m.createdAt.toISOString() } } }
  } catch (err) {
    return toActionError(err)
  }
}
