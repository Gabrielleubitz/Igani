import 'server-only'
import { currentUserOrNull } from './auth'
import { avatarPath } from './avatar'
import { closeExpiredRooms, markRoomActive } from './meet-lifecycle'
import { prisma } from './prisma'

/** A tab that hasn't checked in for this long has left (tabs check in every 20 seconds). */
export const PRESENCE_TTL_MS = 50_000

/** The room, if this request may see it: a valid invite token, an admin, or an invited teammate. Ended rooms: no. */
export async function roomForPresence(code: string, token: string | null): Promise<{ id: string; avatar: string | null } | null> {
  const found = await prisma.meetRoom.findUnique({ where: { code: code.slice(0, 60) }, select: { id: true, endedAt: true, createdAt: true, scheduledAt: true, durationMin: true, lastActiveAt: true } })
  if (!found || found.endedAt || (await closeExpiredRooms([found])).size) return null
  const user = await currentUserOrNull()
  const me = user ? await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, image: true, email: true } }) : null
  const room = { id: found.id, avatar: me ? avatarPath(me) : null }
  if (token) {
    const inv = await prisma.meetInvite.findUnique({ where: { token: token.slice(0, 100) }, select: { roomId: true, userId: true, email: true } })
    // a guest link opened while signed in as someone else shows no photo
    if (inv?.roomId === found.id) return me && (inv.userId === me.id || inv.email === me.email?.toLowerCase()) ? room : { ...room, avatar: null }
  }
  if (!user) return null
  if (user.role === 'ADMIN') return room
  const invited = await prisma.meetInvite.findFirst({ where: { roomId: found.id, userId: user.id }, select: { id: true } })
  return invited ? room : null
}

/** Names of the people in the call now (one per tab key), oldest first. */
export async function peopleInRoom(roomId: string, now = new Date()): Promise<{ name: string; avatar: string | null }[]> {
  const rows = await prisma.meetPresence.findMany({ where: { roomId, seenAt: { gt: new Date(now.getTime() - PRESENCE_TTL_MS) } }, orderBy: { seenAt: 'asc' }, select: { name: true, avatar: true }, take: 30 })
  return rows
}

export async function checkIn(roomId: string, key: string, name: string, avatar: string | null, now = new Date()): Promise<void> {
  await prisma.meetPresence.upsert({ where: { roomId_key: { roomId, key } }, create: { roomId, key, name, avatar, seenAt: now }, update: { name, avatar, seenAt: now } })
  await markRoomActive(roomId, now)
  // tidy up: old check-ins in this room
  if (Math.random() < 0.1) await prisma.meetPresence.deleteMany({ where: { roomId, seenAt: { lt: new Date(now.getTime() - 10 * 60_000) } } })
}

export async function checkOut(roomId: string, key: string): Promise<void> {
  await prisma.meetPresence.deleteMany({ where: { roomId, key } })
}
