import 'server-only'
import { prisma } from './prisma'

/**
 * Igani Meet rooms close on their own, like a real meeting:
 * - once a call has happened, 30 minutes after the last person left (never while anyone is still in it: open call
 *   tabs check in every 20 seconds, which keeps lastActiveAt fresh);
 * - a scheduled meeting stays open at least until 30 minutes after its slot ends, even if someone tried the link early;
 * - a scheduled meeting nobody joined closes 2 hours after its slot ends;
 * - a "for later" link nobody used closes after 7 days.
 */
export const EMPTY_FOR_MS = 30 * 60_000
export const NO_SHOW_MS = 2 * 60 * 60_000
export const UNUSED_LINK_MS = 7 * 24 * 60 * 60_000

export interface RoomClock {
  createdAt: Date
  scheduledAt: Date | null
  durationMin: number
  lastActiveAt: Date | null
}

export function meetClosesAt(r: RoomClock): Date {
  const slotEnd = r.scheduledAt ? r.scheduledAt.getTime() + r.durationMin * 60_000 : null
  if (r.lastActiveAt) return new Date(Math.max(r.lastActiveAt.getTime() + EMPTY_FOR_MS, slotEnd === null ? 0 : slotEnd + EMPTY_FOR_MS))
  if (slotEnd !== null) return new Date(slotEnd + NO_SHOW_MS)
  return new Date(r.createdAt.getTime() + UNUSED_LINK_MS)
}

export function meetIsOver(r: RoomClock & { endedAt: Date | null }, now = new Date()): boolean {
  return Boolean(r.endedAt) || meetClosesAt(r).getTime() <= now.getTime()
}

/** Closes the rooms (from this list) whose time is up. Returns the ids it closed. */
export async function closeExpiredRooms(rooms: (RoomClock & { id: string; endedAt: Date | null })[], now = new Date()): Promise<Set<string>> {
  const ids = rooms.filter((r) => !r.endedAt && meetIsOver(r, now)).map((r) => r.id)
  if (ids.length) await prisma.meetRoom.updateMany({ where: { id: { in: ids }, endedAt: null }, data: { endedAt: now } })
  return new Set(ids)
}

/** Someone is in the call (or just joined): keeps the room open. Writes at most about once a minute per room. */
export async function markRoomActive(roomId: string, now = new Date()): Promise<void> {
  await prisma.meetRoom.updateMany({ where: { id: roomId, OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: new Date(now.getTime() - 60_000) } }] }, data: { lastActiveAt: now } })
}
