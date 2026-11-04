'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteVideo, listVideos, objectInfo, removeObject, saveVideo, storageConfigured, updateVideo, uploadUrl } from '@/lib/video'
import { fitsLimits, usedBytes, type VideoRecord } from '@/lib/video-core'
import { randomBytes } from 'node:crypto'

export type VideoAction = { ok: true } | { ok: false; error: string }

/** Step 1: checks limits and returns a one-time link for the browser to upload straight to the private bucket. */
export async function createUpload(input: { filename: string; size: number; contentType: string }): Promise<{ ok: true; url: string; key: string } | { ok: false; error: string }> {
  await requireUser(['ADMIN'])
  if (!storageConfigured()) return { ok: false, error: 'Video storage is not connected yet: add the Cloudflare R2 variables in Vercel.' }
  const err = fitsLimits(input.size, input.contentType, usedBytes(await listVideos()))
  if (err) return { ok: false, error: err }
  const safe = input.filename.replace(/[^A-Za-z0-9._-]+/g, '-').slice(-80)
  const key = `videos/${randomBytes(6).toString('hex')}-${safe}`
  return { ok: true, url: await uploadUrl(key, input.contentType), key }
}

/** After the browser finished uploading: confirm the file really is in the private store, then save its record. */
export async function registerVideo(input: { title: string; pathname: string; contentType: string }): Promise<VideoAction> {
  await requireUser(['ADMIN'])
  if (!input.pathname.startsWith('videos/')) return { ok: false, error: 'Invalid upload.' }
  const blob = await objectInfo(input.pathname)
  if (!blob) return { ok: false, error: 'The upload was not found. Please try again.' }
  const used = usedBytes(await listVideos())
  const err = fitsLimits(blob.size, input.contentType, used)
  if (err) {
    await removeObject(input.pathname).catch(() => undefined)
    return { ok: false, error: err }
  }
  await saveVideo({ title: input.title.trim().slice(0, 120) || 'Untitled video', pathname: input.pathname, size: blob.size, contentType: input.contentType, visibility: 'team', offerId: null })
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
