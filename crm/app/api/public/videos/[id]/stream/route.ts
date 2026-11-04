import { NextResponse } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getVideo, playUrl } from '@/lib/video'
import { markStarted, unlockedFor } from '@/lib/video-progress'
import { canWatch, isVideoId } from '@/lib/video-core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Plays a private video. Allowed: signed-in teammates (team videos), admins (all), and visitors of the live offer the video
 * belongs to (?o=<offer slug>). Anyone else gets 404. When allowed we redirect to a 5-minute signed link straight to the private
 * bucket, so the file is never public, never passes through our server (no function bandwidth) and seeking works natively.
 */
export async function GET(req: Request, props: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await props.params
  const deny = (): NextResponse => NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!isVideoId(id)) return deny()
  const video = await getVideo(id)
  if (!video) return deny()
  const slug = new URL(req.url).searchParams.get('o')
  const [viewer, offer] = await Promise.all([
    currentUserOrNull(),
    slug && video.visibility === 'offer' ? prisma.offer.findUnique({ where: { slug }, select: { id: true, status: true } }) : null,
  ])
  // Salespeople unlock the course one video at a time
  const gated = viewer?.role === 'SALES' && video.visibility === 'team' ? await unlockedFor(viewer.id) : null
  if (!canWatch(video, viewer ? { role: viewer.role, unlocked: gated?.unlocked } : null, offer)) return deny()
  if (viewer && gated) await markStarted(viewer.id, video.id, gated.progress)
  try {
    return NextResponse.redirect(await playUrl(video.pathname, video.contentType), { status: 302, headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } })
  } catch {
    return NextResponse.json({ error: 'Video storage is not connected' }, { status: 503 })
  }
}
