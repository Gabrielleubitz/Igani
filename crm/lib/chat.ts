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

/** Unread messages in your channels and direct conversations; mentions = @you plus every unread direct message. */
export async function chatUnreadFor(userId: string): Promise<{ unread: number; mentions: number }> {
  const [row] = await prisma.$queryRaw<{ unread: number; mentions: number }[]>`
    SELECT count(*)::int AS unread,
           count(*) FILTER (WHERE c."kind" = 'DM' OR strpos(m."body", ${`<@${userId}>`}) > 0)::int AS mentions
    FROM "ChatMessage" m
    JOIN "ChatMember" cm ON cm."channelId" = m."channelId" AND cm."userId" = ${userId}
    JOIN "ChatChannel" c ON c."id" = m."channelId" AND c."archivedAt" IS NULL
    WHERE m."createdAt" > cm."lastReadAt" AND m."deletedAt" IS NULL AND (m."userId" IS NULL OR m."userId" <> ${userId})`
  return { unread: row?.unread ?? 0, mentions: row?.mentions ?? 0 }
}
