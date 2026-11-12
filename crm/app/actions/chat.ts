'use server'

import { createHash } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { chatFileLink, cloudinaryConfigured } from '@/lib/cloudinary'
import { avatarPath } from '@/lib/avatar'
import {
  CHAT_EMOJI,
  CHAT_FILE_MAX,
  CHAT_MAX,
  ONLINE_MS,
  canSeeChannel,
  chatFileView,
  channelSlug,
  chatFolder,
  chatNewestFor,
  chatTeam,
  chatUnreadByChannel,
  chatUnreadFor,
  dmKeyFor,
  ensureGeneral,
  leadLinksIn,
  mentionsIn,
  onlineIds,
  readFiles,
  setTyping,
  stopTyping,
  touchPresence,
  typingIn,
  type ChatFile,
  type ChatPerson,
} from '@/lib/chat'
import { chatPushMessage, chatRecipients, type ChatReason } from '@/lib/chat-notify'
import { leadName } from '@/lib/format'
import { canSeeLead } from '@/lib/lead-access'
import { prisma } from '@/lib/prisma'
import { photoUrl, pushLater } from '@/lib/push'
import { toActionError, type ActionResult } from './result'

const id = z.string().regex(/^[a-z0-9]{20,40}$/i)
const NOT_FOUND = 'That conversation is gone or you are not in it.'
/** polls ask for everything changed since their cursor, minus this much (a message saved while a poll ran is never missed) */
const OVERLAP_MS = 3000

export interface ChatChannelRow {
  id: string
  kind: 'CHANNEL' | 'DM'
  /** channel name ("sales-floor"), or the other person's name for a direct conversation */
  name: string
  topic: string | null
  private: boolean
  member: boolean
  muted: boolean
  unread: number
  /** mentions of you, and every unread direct message */
  mentions: number
  lastMessageAt: string
  /** direct conversations: the other person */
  dm: { id: string; photo: string | null; role: string; online: boolean } | null
}

export type ChatPersonLive = ChatPerson & { online: boolean }

export interface ChatOverview {
  me: ChatPerson
  isAdmin: boolean
  channels: ChatChannelRow[]
  people: ChatPersonLive[]
  /** files can be attached (Cloudinary is set up) */
  files: boolean
}

export interface ChatReactionRow {
  emoji: string
  count: number
  mine: boolean
  names: string[]
}

export interface ChatFileRow {
  kind: 'image' | 'file'
  name: string
  bytes: number
  mime: string
  width: number | null
  height: number | null
  /** opens (or downloads) the file; images also have a smaller preview */
  url: string
  thumb: string | null
  /** what the viewer can show, and links for it */
  view: 'image' | 'video' | 'pdf' | null
  viewUrl: string
  download: string
  forwarded: boolean
}

export interface ChatLeadCard {
  id: string
  name: string
  company: string | null
  status: string
  owner: string | null
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
  /** a reply in a thread: the message it answers */
  parentId: string | null
  replyCount: number
  lastReplyAt: string | null
  /** photos of the last few people who replied (thread summary) */
  repliers: { name: string; photo: string | null }[]
  files: ChatFileRow[]
  /** leads linked in the message (only ones you may see) */
  leads: ChatLeadCard[]
}

export interface ChatChannelInfo {
  id: string
  kind: 'CHANNEL' | 'DM'
  name: string
  topic: string | null
  private: boolean
  member: boolean
  muted: boolean
  /** may rename, change the topic, add people and archive */
  canManage: boolean
  members: ChatPerson[]
  createdAt: string
}

export interface ChatPage {
  /** sent on the first page only (polls keep what they have) */
  channel: ChatChannelInfo | null
  messages: ChatMessageRow[]
  /** older messages exist (load with before = the first message's time) */
  more: boolean
  /** pass back as `since` to get only what changed */
  cursor: string
  /** everyone's read position, for "Seen" in direct conversations */
  readBy: { userId: string; at: string }[]
  /** your own read position when the page was opened: where "New messages" starts */
  myLastReadAt: string | null
  /** others typing here right now */
  typing: string[]
  /** thread view: the message the thread is about */
  parent: ChatMessageRow | null
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

const fileUrl = (messageId: string, i: number, mode: '' | 'thumb' | 'view' | 'download' = ''): string =>
  `/api/chat/files/${messageId}/${i}${mode === 'thumb' ? '?size=thumb' : mode ? `?${mode}=1` : ''}`

type DbMessage = Prisma.ChatMessageGetPayload<{ include: { reactions: true } }>

/** Messages as the screens draw them: names and photos, reactions, files, linked leads, thread summary. */
async function present(rows: DbMessage[], user: { id: string; role: 'ADMIN' | 'SALES' | 'MARKETING' }): Promise<ChatMessageRow[]> {
  const threadIds = rows.filter((m) => m.replyCount > 0).map((m) => m.id)
  const recentReplies = threadIds.length
    ? await prisma.$queryRaw<{ parentId: string; userId: string | null }[]>`
        SELECT "parentId", "userId" FROM (
          SELECT DISTINCT ON ("parentId", "userId") "parentId", "userId", "createdAt" FROM "ChatMessage"
          WHERE "parentId" = ANY(${threadIds}) AND "deletedAt" IS NULL ORDER BY "parentId", "userId", "createdAt" DESC
        ) r ORDER BY "createdAt" DESC`
    : []
  const leadIds = [...new Set(rows.flatMap((m) => (m.deletedAt ? [] : leadLinksIn(m.body))))]
  const leads = leadIds.length
    ? await prisma.lead.findMany({ where: { id: { in: leadIds } }, select: { id: true, firstName: true, lastName: true, email: true, company: true, status: true, assignedToId: true, assignedTo: { select: { name: true, email: true } } } })
    : []
  const leadBy = new Map<string, ChatLeadCard>(leads.filter((l) => canSeeLead(user, l)).map((l) => [l.id, { id: l.id, name: leadName(l), company: l.company, status: String(l.status), owner: l.assignedTo ? (l.assignedTo.name ?? l.assignedTo.email) : null }]))
  const people = await userMap([...rows.map((m) => m.userId ?? ''), ...rows.flatMap((m) => m.reactions.map((r) => r.userId)), ...recentReplies.map((r) => r.userId ?? '')].filter(Boolean))
  return rows.map((m) => {
    const who = m.userId ? people.get(m.userId) : null
    const grouped = new Map<string, string[]>()
    for (const r of m.reactions) grouped.set(r.emoji, [...(grouped.get(r.emoji) ?? []), r.userId])
    const files = m.deletedAt ? [] : readFiles(m.attachments)
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
      parentId: m.parentId,
      replyCount: m.replyCount,
      lastReplyAt: m.lastReplyAt?.toISOString() ?? null,
      repliers: recentReplies
        .filter((r) => r.parentId === m.id && r.userId)
        .slice(0, 3)
        .map((r) => ({ name: people.get(r.userId!)?.name ?? 'Someone', photo: people.get(r.userId!)?.photo ?? null })),
      files: files.map((f, i) => ({ kind: f.kind, name: f.name, bytes: f.bytes, mime: f.mime, width: f.width ?? null, height: f.height ?? null, url: fileUrl(m.id, i), thumb: f.kind === 'image' ? fileUrl(m.id, i, 'thumb') : null, view: chatFileView(f), viewUrl: fileUrl(m.id, i, 'view'), download: fileUrl(m.id, i, 'download'), forwarded: Boolean(f.fwd) })),
      leads: leadLinksIn(m.deletedAt ? '' : m.body)
        .map((l) => leadBy.get(l))
        .filter((l): l is ChatLeadCard => Boolean(l)),
    }
  })
}

/** Your channels and conversations with unread counts, plus the team (online or not) for new conversations and mentions. */
export async function chatOverview(): Promise<ActionResult<ChatOverview>> {
  try {
    const user = await requireUser()
    await ensureGeneral()
    // #general is everyone's: you're in it from your first visit
    const general = await prisma.chatChannel.findFirst({ where: { kind: 'CHANNEL', name: 'general', archivedAt: null }, select: { id: true } })
    if (general) await prisma.chatMember.upsert({ where: { channelId_userId: { channelId: general.id, userId: user.id } }, create: { channelId: general.id, userId: user.id }, update: {} })
    await touchPresence(user.id).catch(() => undefined)
    const [team, channels, memberships, counts, online] = await Promise.all([
      chatTeam(),
      prisma.chatChannel.findMany({
        where: { archivedAt: null, OR: [{ kind: 'CHANNEL', private: false }, { members: { some: { userId: user.id } } }] },
        orderBy: { lastMessageAt: 'desc' },
        take: 300,
        include: { members: { select: { userId: true } } },
      }),
      prisma.chatMember.findMany({ where: { userId: user.id }, select: { channelId: true, muted: true } }),
      chatUnreadByChannel(user.id),
      onlineIds(),
    ])
    const people: ChatPersonLive[] = team.map((p) => ({ ...p, online: online.has(p.id) }))
    const mine = new Map(memberships.map((m) => [m.channelId, m]))
    const personBy = new Map(people.map((p) => [p.id, p]))
    const others = channels.filter((c) => c.kind === 'DM').map((c) => c.members.find((m) => m.userId !== user.id)?.userId ?? user.id)
    const extra = await userMap(others.filter((o) => !personBy.has(o)))
    const me = personBy.get(user.id) ?? { id: user.id, name: user.name ?? user.email, role: user.role, photo: null, online: true }
    const rows: ChatChannelRow[] = channels.map((c) => {
      const n = counts.get(c.id)
      const muted = mine.get(c.id)?.muted ?? false
      if (c.kind === 'DM') {
        const otherId = c.members.find((m) => m.userId !== user.id)?.userId ?? user.id
        const other = personBy.get(otherId) ?? (extra.get(otherId) ? { id: otherId, ...extra.get(otherId)!, role: 'SALES' as const, online: false } : null)
        return { id: c.id, kind: 'DM', name: otherId === user.id ? `${me.name} (you)` : (other?.name ?? 'Former teammate'), topic: null, private: true, member: true, muted, unread: n?.unread ?? 0, mentions: n?.mentions ?? 0, lastMessageAt: c.lastMessageAt.toISOString(), dm: { id: otherId, photo: other?.photo ?? null, role: other?.role ?? 'SALES', online: otherId === user.id || (other?.online ?? false) } }
      }
      return { id: c.id, kind: 'CHANNEL', name: c.name, topic: c.topic, private: c.private, member: mine.has(c.id), muted, unread: n?.unread ?? 0, mentions: n?.mentions ?? 0, lastMessageAt: c.lastMessageAt.toISOString(), dm: null }
    })
    const files = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
    return { ok: true, data: { me, isAdmin: user.role === 'ADMIN', channels: rows, people, files } }
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

const pageInput = z.object({ channelId: id, threadId: id.optional().nullable(), before: z.string().datetime().optional(), since: z.string().datetime().optional() })

/**
 * A channel's messages (newest 60, or the 60 before `before`), or one thread (its first message and every reply).
 * With `since`: only what changed after it (new, edited, deleted, reacted to, replied to), plus who's typing.
 */
export async function chatMessages(input: z.input<typeof pageInput>): Promise<ActionResult<ChatPage>> {
  try {
    const user = await requireUser()
    const { channelId, threadId, before, since } = pageInput.parse(input)
    const channel = await loadChannel(channelId, user.id)
    if (!channel) return { ok: false, error: NOT_FOUND }
    const cursor = new Date().toISOString()
    const changed = since ? new Date(new Date(since).getTime() - OVERLAP_MS) : null
    const take = 60
    let rows: DbMessage[]
    let more = false
    let parent: DbMessage | null = null
    if (threadId) {
      parent = await prisma.chatMessage.findFirst({ where: { id: threadId, channelId, parentId: null }, include: { reactions: true } })
      if (!parent) return { ok: false, error: 'That thread is gone.' }
      rows = await prisma.chatMessage.findMany({ where: { parentId: threadId, ...(changed ? { updatedAt: { gt: changed } } : {}) }, orderBy: { createdAt: 'asc' }, take: 300, include: { reactions: true } })
      if (changed && parent.updatedAt <= changed) parent = null
    } else if (changed) {
      rows = await prisma.chatMessage.findMany({ where: { channelId, parentId: null, updatedAt: { gt: changed } }, orderBy: { createdAt: 'asc' }, take: 200, include: { reactions: true } })
    } else {
      const page = await prisma.chatMessage.findMany({ where: { channelId, parentId: null, ...(before ? { createdAt: { lt: new Date(before) } } : {}) }, orderBy: { createdAt: 'desc' }, take: take + 1, include: { reactions: true } })
      more = page.length > take
      rows = (more ? page.slice(0, take) : page).reverse()
    }
    const [members, typingIds, presented, parentRow] = await Promise.all([
      prisma.chatMember.findMany({ where: { channelId }, select: { userId: true, lastReadAt: true, muted: true } }),
      typingIn(channelId, threadId ?? null, user.id),
      present(rows, user),
      parent ? present([parent], user).then((p) => p[0] ?? null) : Promise.resolve(null),
    ])
    const memberIds = members.map((m) => m.userId)
    const mine = members.find((m) => m.userId === user.id)
    let info: ChatChannelInfo | null = null
    if (!changed && !before) {
      const team = await chatTeam()
      const teamBy = new Map(team.map((p) => [p.id, p]))
      const otherId = channel.kind === 'DM' ? (memberIds.find((m) => m !== user.id) ?? user.id) : null
      const otherName = otherId ? (teamBy.get(otherId)?.name ?? (await userMap([otherId])).get(otherId)?.name ?? 'Former teammate') : ''
      info = {
        id: channel.id,
        kind: channel.kind,
        name: channel.kind === 'DM' ? (otherId === user.id ? 'Notes to self' : otherName) : channel.name,
        topic: channel.topic,
        private: channel.private,
        member: Boolean(mine) || channel.kind === 'DM',
        muted: mine?.muted ?? false,
        canManage: channel.kind === 'CHANNEL' && (user.role === 'ADMIN' || channel.createdById === user.id),
        members: memberIds.map((m) => teamBy.get(m)).filter((p): p is ChatPerson => Boolean(p)),
        createdAt: channel.createdAt.toISOString(),
      }
    }
    const typingPeople = typingIds.length ? await userMap(typingIds) : new Map<string, { name: string }>()
    return {
      ok: true,
      data: {
        channel: info,
        messages: presented,
        more,
        cursor,
        readBy: members.filter((m) => m.userId !== user.id).map((m) => ({ userId: m.userId, at: m.lastReadAt.toISOString() })),
        myLastReadAt: mine?.lastReadAt.toISOString() ?? null,
        typing: typingIds.map((t) => typingPeople.get(t)?.name ?? 'Someone'),
        parent: parentRow,
      },
    }
  } catch (err) {
    return toActionError(err)
  }
}

const fileInput = z.object({
  publicId: z.string().min(3).max(300),
  kind: z.enum(['image', 'file']),
  resourceType: z.enum(['image', 'raw', 'video']).default('raw'),
  format: z.string().max(20).optional().nullable(),
  name: z.string().trim().min(1).max(200),
  bytes: z.number().int().min(0).max(CHAT_FILE_MAX),
  mime: z.string().max(120).default('application/octet-stream'),
  width: z.number().int().positive().max(20000).optional().nullable(),
  height: z.number().int().positive().max(20000).optional().nullable(),
})

const sendInput = z.object({
  channelId: id,
  body: z.string().trim().max(CHAT_MAX, `Keep it under ${CHAT_MAX} characters.`).default(''),
  /** reply in this message's thread */
  parentId: id.optional().nullable(),
  files: z.array(fileInput).max(10).default([]),
})

/** Post a message (or a thread reply), with files if any. Joins a public channel as you post and marks it read. */
export async function chatSend(input: z.input<typeof sendInput>): Promise<ActionResult<{ id: string; at: string }>> {
  try {
    const user = await requireUser()
    const { channelId, body, parentId, files } = sendInput.parse(input)
    if (!body && !files.length) return { ok: false, error: 'Write something first.' }
    const channel = await loadChannel(channelId, user.id)
    if (!channel) return { ok: false, error: NOT_FOUND }
    // files must be ones uploaded for this channel (the upload ticket only allows its folder)
    const folder = `${chatFolder(channelId)}/`
    if (files.some((f) => !f.publicId.startsWith(folder))) return { ok: false, error: 'That file was not uploaded here.' }
    const stored: (ChatFile & { rt: string; format: string | null })[] = files.map((f) => ({ publicId: f.publicId, kind: f.kind, name: f.name, bytes: f.bytes, mime: f.mime, width: f.width ?? null, height: f.height ?? null, rt: f.resourceType, format: f.format ?? null }))
    const now = new Date()
    const parent = parentId ? await prisma.chatMessage.findFirst({ where: { id: parentId, channelId, parentId: null, deletedAt: null }, select: { id: true, userId: true } }) : null
    if (parentId && !parent) return { ok: false, error: 'That thread is gone.' }
    const msg = await prisma.$transaction(async (tx) => {
      const m = await tx.chatMessage.create({ data: { channelId, userId: user.id, body, createdAt: now, updatedAt: now, parentId: parent?.id ?? null, attachments: stored.length ? (stored as unknown as Prisma.InputJsonValue) : undefined } })
      if (parent) await tx.chatMessage.update({ where: { id: parent.id }, data: { replyCount: { increment: 1 }, lastReplyAt: now, updatedAt: now } })
      await tx.chatChannel.update({ where: { id: channelId }, data: { lastMessageAt: now } })
      await tx.chatMember.upsert({ where: { channelId_userId: { channelId, userId: user.id } }, create: { channelId, userId: user.id, lastReadAt: now }, update: { lastReadAt: now } })
      return m
    })
    await stopTyping(user.id).catch(() => undefined)
    notifyChat(channel, user.id, body || (files.length ? `📎 ${files.length === 1 ? files[0]!.name : `${files.length} files`}` : ''), parent ? { threadId: parent.id, starterId: parent.userId } : null)
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
    const now = new Date()
    const done = await prisma.chatMessage.updateMany({ where: { id: messageId, userId: user.id, deletedAt: null }, data: { body, editedAt: now, updatedAt: now } })
    return done.count ? { ok: true, data: undefined } : { ok: false, error: 'You can only edit your own messages.' }
  } catch (err) {
    return toActionError(err)
  }
}

/** Delete your own message (admins can delete anyone's). It shows as "message deleted"; its files go with it. */
export async function chatDelete(messageId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const mid = id.parse(messageId)
    const now = new Date()
    const done = await prisma.chatMessage.updateMany({ where: { id: mid, deletedAt: null, ...(user.role === 'ADMIN' ? {} : { userId: user.id }) }, data: { deletedAt: now, updatedAt: now, body: '', attachments: Prisma.DbNull } })
    if (done.count) {
      await prisma.chatReaction.deleteMany({ where: { messageId: mid } })
      // a thread reply: the thread's count and "last reply" follow
      const msg = await prisma.chatMessage.findUnique({ where: { id: mid }, select: { parentId: true } })
      if (msg?.parentId) {
        const [count, last] = await Promise.all([
          prisma.chatMessage.count({ where: { parentId: msg.parentId, deletedAt: null } }),
          prisma.chatMessage.findFirst({ where: { parentId: msg.parentId, deletedAt: null }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
        ])
        await prisma.chatMessage.update({ where: { id: msg.parentId }, data: { replyCount: count, lastReplyAt: last?.createdAt ?? null, updatedAt: now } })
      }
    }
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
    await prisma.$transaction([
      had ? prisma.chatReaction.delete({ where: key }) : prisma.chatReaction.create({ data: { messageId, userId: user.id, emoji } }),
      // so everyone's next poll picks the reaction up
      prisma.chatMessage.update({ where: { id: messageId }, data: { updatedAt: new Date() } }),
    ])
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

/** "…is typing" for a few seconds (the composer calls this while you type). */
export async function chatTyping(channelId: string, threadId?: string | null): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const cid = id.parse(channelId)
    await setTyping(user.id, cid, threadId ? id.parse(threadId) : null)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Mute a channel: no unread counts or notifications from it, except when someone @mentions you. */
export async function chatMute(channelId: string, muted: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const cid = id.parse(channelId)
    const ch = await loadChannel(cid, user.id)
    if (!ch) return { ok: false, error: NOT_FOUND }
    await prisma.chatMember.upsert({ where: { channelId_userId: { channelId: cid, userId: user.id } }, create: { channelId: cid, userId: user.id, muted: Boolean(muted) }, update: { muted: Boolean(muted) } })
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

export interface ChatUploadTicket {
  url: string
  fields: Record<string, string>
  maxBytes: number
}

/** A short-lived link to a file shared in chat (for the app, which can't send its sign-in to Cloudinary). */
export async function chatFileUrl(messageId: string, index: number, mode: boolean | 'thumb' | 'view' | 'download' = false): Promise<ActionResult<{ url: string }>> {
  try {
    const user = await requireUser()
    const mid = id.parse(messageId)
    const i = z.number().int().min(0).max(20).parse(index)
    const msg = await prisma.chatMessage.findUnique({ where: { id: mid }, include: { channel: true } })
    if (!msg || msg.deletedAt || msg.channel.archivedAt || !(await canSeeChannel(msg.channel, user.id))) return { ok: false, error: NOT_FOUND }
    const file = readFiles(msg.attachments)[i]
    if (!file || !cloudinaryConfigured()) return { ok: false, error: NOT_FOUND }
    return { ok: true, data: { url: chatFileLink(file, { mode: mode === true ? 'thumb' : mode || undefined }) } }
  } catch (err) {
    return toActionError(err)
  }
}

const forwardInput = z.object({ messageId: id, index: z.number().int().min(0).max(20), toChannelId: id })

/** Forward one file to another conversation you can post in (like WhatsApp's forward). */
export async function chatForward(input: z.input<typeof forwardInput>): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser()
    const { messageId, index, toChannelId } = forwardInput.parse(input)
    const msg = await prisma.chatMessage.findUnique({ where: { id: messageId }, include: { channel: true } })
    if (!msg || msg.deletedAt || msg.channel.archivedAt || !(await canSeeChannel(msg.channel, user.id))) return { ok: false, error: NOT_FOUND }
    const file = readFiles(msg.attachments)[index]
    if (!file) return { ok: false, error: NOT_FOUND }
    const target = await loadChannel(toChannelId, user.id)
    if (!target) return { ok: false, error: NOT_FOUND }
    const now = new Date()
    const copy = { ...file, fwd: true }
    const m = await prisma.$transaction(async (tx) => {
      const made = await tx.chatMessage.create({ data: { channelId: target.id, userId: user.id, body: '', createdAt: now, updatedAt: now, attachments: [copy] as unknown as Prisma.InputJsonValue } })
      await tx.chatChannel.update({ where: { id: target.id }, data: { lastMessageAt: now } })
      await tx.chatMember.upsert({ where: { channelId_userId: { channelId: target.id, userId: user.id } }, create: { channelId: target.id, userId: user.id, lastReadAt: now }, update: { lastReadAt: now } })
      return made
    })
    notifyChat(target, user.id, `📎 ${file.name}`, null)
    return { ok: true, data: { id: m.id } }
  } catch (err) {
    return toActionError(err)
  }
}

/**
 * Permission to upload one file to this channel's private folder, straight from the browser or the app to Cloudinary
 * (nothing passes through our server). Files are private: they open only through the CRM, for people who can see the channel.
 */
export async function chatUploadTicket(channelId: string): Promise<ActionResult<ChatUploadTicket>> {
  try {
    const user = await requireUser()
    const cid = id.parse(channelId)
    if (!(await loadChannel(cid, user.id))) return { ok: false, error: NOT_FOUND }
    const cloud = process.env.CLOUDINARY_CLOUD_NAME
    const key = process.env.CLOUDINARY_API_KEY
    const secret = process.env.CLOUDINARY_API_SECRET
    if (!cloud || !key || !secret) return { ok: false, error: 'File sharing isn’t set up yet (Cloudinary keys in Vercel).' }
    const params: Record<string, string> = { folder: chatFolder(cid), timestamp: String(Math.floor(Date.now() / 1000)), type: 'authenticated', use_filename: 'true', unique_filename: 'true' }
    const toSign = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&')
    const signature = createHash('sha1').update(toSign + secret).digest('hex')
    return { ok: true, data: { url: `https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, fields: { ...params, api_key: key, signature }, maxBytes: CHAT_FILE_MAX } }
  } catch (err) {
    return toActionError(err)
  }
}

export interface ChatSearchHit {
  id: string
  channelId: string
  where: string
  threadId: string | null
  name: string
  body: string
  at: string
}

/** Search messages you can see (newest first). */
export async function chatSearch(query: string): Promise<ActionResult<ChatSearchHit[]>> {
  try {
    const user = await requireUser()
    const q = z.string().trim().min(2).max(100).parse(query)
    const rows = await prisma.chatMessage.findMany({
      where: {
        deletedAt: null,
        body: { contains: q, mode: 'insensitive' },
        channel: { archivedAt: null, OR: [{ kind: 'CHANNEL', private: false }, { members: { some: { userId: user.id } } }] },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { channel: { select: { kind: true, name: true, members: { select: { userId: true } } } } },
    })
    const people = await userMap([...rows.map((r) => r.userId ?? ''), ...rows.flatMap((r) => (r.channel.kind === 'DM' ? r.channel.members.map((m) => m.userId) : []))].filter(Boolean))
    return {
      ok: true,
      data: rows.map((r) => {
        const other = r.channel.kind === 'DM' ? r.channel.members.find((m) => m.userId !== user.id)?.userId : null
        return { id: r.id, channelId: r.channelId, where: r.channel.kind === 'DM' ? (other ? (people.get(other)?.name ?? 'Direct message') : 'Notes to self') : `#${r.channel.name}`, threadId: r.parentId, name: r.userId ? (people.get(r.userId)?.name ?? 'Someone') : 'Someone', body: r.body.slice(0, 300), at: r.createdAt.toISOString() }
      }),
    }
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

/** Leave a channel (you can rejoin a public one; a private one needs someone to add you back). #general stays. */
export async function chatLeave(channelId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const cid = id.parse(channelId)
    const ch = await prisma.chatChannel.findUnique({ where: { id: cid }, select: { kind: true, name: true } })
    if (!ch || ch.kind !== 'CHANNEL') return { ok: false, error: NOT_FOUND }
    if (ch.name === 'general') return { ok: false, error: 'Everyone stays in #general. Mute it if it’s too busy.' }
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

export interface ChatPulseItem {
  id: string
  channelId: string
  threadId: string | null
  /** why it's for you: a direct message, an @mention, a reply in your thread, or a channel you follow */
  reason: ChatReason
  where: string
  from: string
  photo: string | null
  preview: string
  at: string
}

export interface ChatPulse {
  unread: number
  mentions: number
  /** the server's clock when this was answered: the next check treats anything newer as just arrived */
  now: string
  /** the newest unread messages that are for you (newest first), by the same rules as the phone's push */
  latest: ChatPulseItem[]
}

/** For the notifier on every page: unread counts and the newest messages that are for you. */
export async function chatPulse(): Promise<ActionResult<ChatPulse>> {
  try {
    const user = await requireUser()
    const now = new Date()
    const [counts, rows] = await Promise.all([chatUnreadFor(user.id), chatNewestFor(user.id, 5)])
    if (!rows.length) return { ok: true, data: { ...counts, now: now.toISOString(), latest: [] } }
    const people = await userMap(rows.flatMap((m) => [m.userId, ...mentionsIn(m.body)]).filter((x): x is string => Boolean(x)))
    const latest = rows.map((m): ChatPulseItem => {
      const who = m.userId ? people.get(m.userId) : null
      return {
        id: m.id,
        channelId: m.channelId,
        threadId: m.parentId,
        reason: m.reason,
        where: `${m.kind === 'DM' ? 'Direct message' : `#${m.name}`}${m.parentId ? ' · thread' : ''}`,
        from: who?.name ?? 'Someone',
        photo: who?.photo ?? null,
        preview: (m.body.replace(/<@([a-z0-9]{20,40})>/gi, (_, i: string) => `@${people.get(i)?.name ?? 'someone'}`) || '📎 A file').slice(0, 140),
        at: m.createdAt.toISOString(),
      }
    })
    return { ok: true, data: { ...counts, now: now.toISOString(), latest } }
  } catch (err) {
    return toActionError(err)
  }
}

/**
 * Push to phones (lib/chat-notify.ts decides who): a direct message to the other person, an @mention to whoever was
 * named (muted or not), a thread reply to the people in that thread, and a channel message to every member who
 * hasn't muted the channel. Never the sender; each phone's own "Team chat" switch is honoured by pushTo.
 */
function notifyChat(channel: { id: string; kind: 'CHANNEL' | 'DM'; name: string; private: boolean }, senderId: string, body: string, thread: { threadId: string; starterId: string | null } | null): void {
  void (async () => {
    const members = await prisma.chatMember.findMany({ where: { channelId: channel.id }, select: { userId: true, muted: true } })
    let people: (string | null)[] = []
    if (thread) {
      const repliers = await prisma.chatMessage.findMany({ where: { parentId: thread.threadId, userId: { not: null } }, select: { userId: true }, distinct: ['userId'] })
      people = [thread.starterId, ...repliers.map((r) => r.userId)]
    }
    const to = chatRecipients({ channel, senderId, body, members, mentioned: mentionsIn(body), thread: thread ? { threadId: thread.threadId, people } : null }).map((r) => r.userId)
    if (!to.length) return
    pushLater(to, 'chat', async () => {
      const names = await userMap([senderId, ...mentionsIn(body)])
      const from = names.get(senderId)
      const text = body.replace(/<@([a-z0-9]{20,40})>/gi, (_, i: string) => `@${names.get(i)?.name ?? 'someone'}`)
      return chatPushMessage({ channel, thread, sender: { id: senderId, name: from?.name ?? null, photo: photoUrl(from?.photo) }, text })
    })
  })().catch(() => undefined)
}

// keeps the online window shared with the screens
export async function chatOnlineWindowMs(): Promise<number> {
  return ONLINE_MS
}
