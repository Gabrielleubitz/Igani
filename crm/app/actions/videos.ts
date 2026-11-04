'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteVideo, listVideos, saveVideo, updateVideo } from '@/lib/video'
import { fitsLimits, usedBytes, type VideoRecord } from '@/lib/video-core'
import { head } from '@vercel/blob'

export type VideoAction = { ok: true } | { ok: false; error: string }

/** After the browser finished uploading: confirm the file really is in the private store, then save its record. */
export async function registerVideo(input: { title: string; pathname: string; contentType: string }): Promise<VideoAction> {
  await requireUser(['ADMIN'])
  if (!input.pathname.startsWith('videos/')) return { ok: false, error: 'Invalid upload.' }
  const blob = await head(input.pathname).catch(() => null)
  if (!blob) return { ok: false, error: 'The upload was not found. Please try again.' }
  const used = usedBytes(await listVideos())
  const err = fitsLimits(blob.size, blob.contentType, used)
  if (err) return { ok: false, error: err }
  await saveVideo({ title: input.title.trim().slice(0, 120) || 'Untitled video', pathname: blob.pathname, size: blob.size, contentType: blob.contentType, visibility: 'team', offerId: null })
  revalidatePath('/admin/videos')
  return { ok: true }
}

export async function setVideoAccess(id: string, visibility: VideoRecord['visibility'], offerId: string | null, title: string): Promise<VideoAction> {
  await requireUser(['ADMIN'])
  if (visibility === 'offer') {
    if (!offerId || !(await prisma.offer.findUnique({ where: { id: offerId }, select: { id: true } }))) return { ok: false, error: 'Choose the offer this video belongs to.' }
  }
  await updateVideo(id, { visibility, offerId: visibility === 'offer' ? offerId : null, title: title.trim().slice(0, 120) || 'Untitled video' })
  revalidatePath('/admin/videos')
  return { ok: true }
}

export async function removeVideo(id: string): Promise<VideoAction> {
  await requireUser(['ADMIN'])
  await deleteVideo(id)
  revalidatePath('/admin/videos')
  return { ok: true }
}
