import 'server-only'
import { currentUserOrNull } from './auth'
import { prisma } from './prisma'
import { getVideo } from './video'
import { hasRecentAck } from './video-ack'
import { needsAck } from './video-ack-core'
import { decideAccess } from './video-access-core'
import { markStarted, unlockedFor } from './video-progress'
import { isVideoId, type Viewer, type VideoRecord } from './video-core'

export type VideoAuth = { ok: true; video: VideoRecord } | { ok: false; status: 403 | 404; error: 'Not found' | 'confirmation_required' }

/**
 * The access check for playing a private video: who is asking, whether their lesson is unlocked, whether they confirmed the
 * confidentiality notice. Allowed: signed-in teammates (team videos), admins (all), and visitors of the live offer the video belongs to
 * (`slug`). Records that a salesperson started the lesson. Anyone else gets 404.
 */
export async function authorizeVideo(id: string, slug: string | null): Promise<VideoAuth> {
  const deny = { ok: false, status: 404, error: 'Not found' } as const
  if (!isVideoId(id)) return deny
  const video = await getVideo(id)
  if (!video) return deny
  const [user, offer] = await Promise.all([
    currentUserOrNull(),
    slug && video.visibility === 'offer' ? prisma.offer.findUnique({ where: { slug }, select: { id: true, status: true } }) : null,
  ])
  // Salespeople unlock the course one video at a time
  const gated = user?.role === 'SALES' && video.visibility === 'team' ? await unlockedFor(user.id) : null
  const viewer: Viewer = user ? { role: user.role, unlocked: gated?.unlocked } : null
  if (decideAccess({ video, viewer, offer, acked: true }) === 'deny') return deny
  // Internal videos need the confidentiality confirmation first (admins are not asked)
  const acked = user && needsAck(user.role, video.visibility) ? await hasRecentAck(user.id, video.id) : true
  if (decideAccess({ video, viewer, offer, acked }) === 'confirmation_required') return { ok: false, status: 403, error: 'confirmation_required' }
  if (user && gated) await markStarted(user.id, video.id, gated.progress)
  return { ok: true, video }
}
