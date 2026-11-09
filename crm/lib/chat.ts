import 'server-only'
import type { ChatChannel, Role } from '@prisma/client'
import { avatarPath } from './avatar'
import { prisma } from './prisma'

/**
 * Team chat (Slack-style): public channels everyone on the team can read and join, private channels only their members
 * see, and direct conversations. Mentions are stored as <@userId> and drawn as @Name by the clients.
 */

export const CHAT_MAX = 4000
export const CHAT_EMOJI = ['👍', '❤️', '😂', '🎉', '🔥', '👀', '✅', '🙏'] as const

/** "Sales Floor!" → "sales-floor" (Slack's channel name rules: lowercase, numbers, dashes, up to 40). */
export function channelSlug(name: string): string {
  return name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export const dmKeyFor = (a: string, b: string): string => [a, b].sort().join(':')

export interface ChatPerson {
  id: string
  name: string
  role: Role
  photo: string | null
}

/** Everyone on the team who can sign in now (active on the access list), by name. */
export async function chatTeam(): Promise<ChatPerson[]> {
  const allowed = await prisma.allowedUser.findMany({ where: { active: true }, select: { email: true, role: true } })
  const roleBy = new Map(allowed.map((a) => [a.email.toLowerCase(), a.role]))
  const users = await prisma.user.findMany({ where: { email: { in: allowed.map((a) => a.email) } }, select: { id: true, name: true, email: true, image: true } })
  return users
    .map((u) => ({ id: u.id, name: u.name?.trim() || (u.email ?? '').split('@')[0] || 'Teammate', role: roleBy.get((u.email ?? '').toLowerCase()) ?? 'SALES', photo: avatarPath({ id: u.id, image: u.image }) }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Whether this person may read a channel (and post in it, joining a public one as they do). */
export async function canSeeChannel(channel: Pick<ChatChannel, 'id' | 'kind' | 'private'>, userId: string): Promise<boolean> {
  if (channel.kind === 'CHANNEL' && !channel.private) return true
  return Boolean(await prisma.chatMember.findUnique({ where: { channelId_userId: { channelId: channel.id, userId } }, select: { userId: true } }))
}

/** #general exists from the start, so a new team has somewhere to talk. */
export async function ensureGeneral(): Promise<void> {
  const any = await prisma.chatChannel.findFirst({ where: { kind: 'CHANNEL', name: 'general' }, select: { id: true } })
  if (!any) await prisma.chatChannel.create({ data: { kind: 'CHANNEL', name: 'general', topic: 'The whole team' } }).catch(() => undefined)
}

/** Mentioned user ids in a message body. */
export const mentionsIn = (body: string): string[] => [...new Set([...body.matchAll(/<@([a-z0-9]{20,40})>/gi)].map((m) => m[1]!))]

/**
 * What counts as unread for a person: top-level messages in channels they're in (not muted), every direct message,
 * and anything that @mentions them (thread replies and muted channels included). Their own messages never count.
 */
export async function chatUnreadFor(userId: string): Promise<{ unread: number; mentions: number }> {
  const me = `<@${userId}>`
  const [row] = await prisma.$queryRaw<{ unread: number; mentions: number }[]>`
    SELECT count(*) FILTER (WHERE (m."parentId" IS NULL AND NOT cm."muted") OR strpos(m."body", ${me}) > 0)::int AS unread,
           count(*) FILTER (WHERE (c."kind" = 'DM' AND m."parentId" IS NULL AND NOT cm."muted") OR strpos(m."body", ${me}) > 0)::int AS mentions
    FROM "ChatMessage" m
    JOIN "ChatMember" cm ON cm."channelId" = m."channelId" AND cm."userId" = ${userId}
    JOIN "ChatChannel" c ON c."id" = m."channelId" AND c."archivedAt" IS NULL
    WHERE m."createdAt" > cm."lastReadAt" AND m."deletedAt" IS NULL AND (m."userId" IS NULL OR m."userId" <> ${userId})`
  return { unread: row?.unread ?? 0, mentions: row?.mentions ?? 0 }
}

/** Per channel: the same counts, for the list. */
export async function chatUnreadByChannel(userId: string): Promise<Map<string, { unread: number; mentions: number }>> {
  const me = `<@${userId}>`
  const rows = await prisma.$queryRaw<{ channelId: string; unread: number; mentions: number }[]>`
    SELECT m."channelId",
           count(*) FILTER (WHERE (m."parentId" IS NULL AND NOT cm."muted") OR strpos(m."body", ${me}) > 0)::int AS unread,
           count(*) FILTER (WHERE (c."kind" = 'DM' AND m."parentId" IS NULL AND NOT cm."muted") OR strpos(m."body", ${me}) > 0)::int AS mentions
    FROM "ChatMessage" m
    JOIN "ChatMember" cm ON cm."channelId" = m."channelId" AND cm."userId" = ${userId}
    JOIN "ChatChannel" c ON c."id" = m."channelId"
    WHERE m."createdAt" > cm."lastReadAt" AND m."deletedAt" IS NULL AND (m."userId" IS NULL OR m."userId" <> ${userId})
    GROUP BY m."channelId"`
  return new Map(rows.map((r) => [r.channelId, { unread: r.unread, mentions: r.mentions }]))
}

// ─── presence and typing ─────────────────────────────────────────────────────

export const ONLINE_MS = 90_000
const TYPING_MS = 6_000

/** "I'm here" (the list polls every few seconds): at most one write a minute per person. */
export async function touchPresence(userId: string): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "ChatPresence" ("userId", "seenAt") VALUES (${userId}, now())
    ON CONFLICT ("userId") DO UPDATE SET "seenAt" = now() WHERE "ChatPresence"."seenAt" < now() - interval '45 seconds'`
}

export async function onlineIds(): Promise<Set<string>> {
  const rows = await prisma.chatPresence.findMany({ where: { seenAt: { gt: new Date(Date.now() - ONLINE_MS) } }, select: { userId: true } })
  return new Set(rows.map((r) => r.userId))
}

export async function setTyping(userId: string, channelId: string, threadId: string | null): Promise<void> {
  await prisma.chatPresence.upsert({ where: { userId }, create: { userId, seenAt: new Date(), typingChannelId: channelId, typingThreadId: threadId, typingAt: new Date() }, update: { seenAt: new Date(), typingChannelId: channelId, typingThreadId: threadId, typingAt: new Date() } })
}

/** Who else is typing here right now. */
export async function typingIn(channelId: string, threadId: string | null, exceptUserId: string): Promise<string[]> {
  const rows = await prisma.chatPresence.findMany({ where: { typingChannelId: channelId, typingThreadId: threadId, typingAt: { gt: new Date(Date.now() - TYPING_MS) }, userId: { not: exceptUserId } }, select: { userId: true } })
  return rows.map((r) => r.userId)
}

export async function stopTyping(userId: string): Promise<void> {
  await prisma.chatPresence.updateMany({ where: { userId }, data: { typingAt: null } })
}

// ─── files ────────────────────────────────────────────────────────────────────

export interface ChatFile {
  publicId: string
  kind: 'image' | 'file'
  name: string
  bytes: number
  mime: string
  width?: number | null
  height?: number | null
}

export const CHAT_FILE_MAX = 20 * 1024 * 1024
export const chatFolder = (channelId: string): string => `igani/chat/${channelId}`

export function readFiles(v: unknown): ChatFile[] {
  if (!Array.isArray(v)) return []
  return v.filter((f): f is ChatFile => !!f && typeof f === 'object' && typeof (f as ChatFile).publicId === 'string')
}

// ─── CRM links in messages ────────────────────────────────────────────────────

/** Lead ids linked in a message (pasted CRM addresses). */
export const leadLinksIn = (body: string): string[] => [...new Set([...body.matchAll(/\/sales\/leads\/([a-z0-9]{20,40})/gi)].map((m) => m[1]!))].slice(0, 3)
