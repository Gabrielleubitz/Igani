'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import { getReel, updateReel } from '@/lib/reels'
import { playUrl } from '@/lib/video'
import { containerStatus, createReelContainer, publishContainer } from '@/lib/instagram'

export type ReelAction = { ok: true; status: string; permalink?: string | null } | { ok: false; error: string }

/** Approve: Instagram fetches the video (1-hour private link) and starts processing it. */
export async function approveReel(id: string, caption: string): Promise<ReelAction> {
  const user = await requireUser(['ADMIN'])
  const reel = await getReel(id)
  if (!reel || reel.status !== 'pending') return { ok: false, error: 'This reel is no longer waiting for approval.' }
  try {
    const containerId = await createReelContainer(await playUrl(reel.key, 'video/mp4', 3600), caption.slice(0, 2200))
    await updateReel(id, { status: 'processing', caption, containerId, decidedBy: user.id, decidedAt: Date.now(), error: null })
    revalidatePath('/admin/reels')
    return { ok: true, status: 'processing' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Instagram refused the video' }
  }
}

/** Polled by the page while Instagram processes it; publishes as soon as it's ready. */
export async function checkReel(id: string): Promise<ReelAction> {
  await requireUser(['ADMIN'])
  const reel = await getReel(id)
  if (!reel?.containerId) return { ok: false, error: 'Nothing is processing.' }
  if (reel.status !== 'processing') return { ok: true, status: reel.status, permalink: reel.permalink }
  try {
    const s = await containerStatus(reel.containerId)
    if (s.status === 'FINISHED') {
      const p = await publishContainer(reel.containerId)
      await updateReel(id, { status: 'posted', permalink: p.permalink })
      revalidatePath('/admin/reels')
      return { ok: true, status: 'posted', permalink: p.permalink }
    }
    if (s.status === 'ERROR' || s.status === 'EXPIRED') {
      await updateReel(id, { status: 'failed', error: s.message ?? s.status })
      revalidatePath('/admin/reels')
      return { ok: false, error: `Instagram couldn't process it: ${s.message ?? s.status}` }
    }
    return { ok: true, status: 'processing' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Instagram check failed' }
  }
}

export async function dismissReel(id: string): Promise<ReelAction> {
  const user = await requireUser(['ADMIN'])
  await updateReel(id, { status: 'dismissed', decidedBy: user.id, decidedAt: Date.now() })
  revalidatePath('/admin/reels')
  return { ok: true, status: 'dismissed' }
}

/** A fresh 30-minute link to watch the reel on the page. */
export async function reelPlayUrl(id: string): Promise<string | null> {
  await requireUser(['ADMIN'])
  const reel = await getReel(id)
  return reel ? playUrl(reel.key, 'video/mp4', 1800) : null
}
