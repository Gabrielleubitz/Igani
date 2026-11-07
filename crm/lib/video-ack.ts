import 'server-only'
import { ackIsValid } from './video-ack-core'
import { prisma } from './prisma'

/** Saves one confirmation (who, which video, when, from where). */
export async function recordAck(userId: string, videoId: string, ip: string, userAgent: string): Promise<void> {
  await prisma.videoAck.create({ data: { userId, videoId, ip: ip.slice(0, 80), userAgent: userAgent.slice(0, 300) } })
}

/** Did this person confirm for this video recently enough to play it? */
export async function hasRecentAck(userId: string, videoId: string, now: Date = new Date()): Promise<boolean> {
  const last = await prisma.videoAck.findFirst({ where: { userId, videoId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } })
  return ackIsValid(last?.createdAt, now)
}
