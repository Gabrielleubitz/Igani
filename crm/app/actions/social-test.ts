'use server'

import { randomBytes } from 'node:crypto'
import { requireUser } from '@/lib/auth'
import { objectInfo, playUrl, removeObject, storageConfigured, uploadUrl } from '@/lib/video'
import { containerStatus, createReelContainer, publishContainer } from '@/lib/instagram'
import { TIKTOK_MAX_SINGLE_UPLOAD, tiktokCreatorInfo, tiktokDirectPost, tiktokPostStatus } from '@/lib/tiktok'

/**
 * "Post now" on the TikTok and Instagram cards in Admin → Settings: an admin uploads a short MP4 and posts it straight
 * away, to prove the connection really can publish before the reel job relies on it. Test files live under
 * `social-tests/` in the private bucket and are removed once the platform has them.
 */
type Fail = { ok: false; error: string }
const PREFIX = 'social-tests/'
const message = (e: unknown, fallback: string): string => (e instanceof Error ? e.message : fallback)
const validKey = (key: string): boolean => key.startsWith(PREFIX) && /^[A-Za-z0-9/_.-]+$/.test(key)

/** Step 1: a one-time link for the browser to upload the test video to the private bucket. */
export async function createTestUpload(input: { size: number; contentType: string }): Promise<{ ok: true; url: string; key: string } | Fail> {
  await requireUser(['ADMIN'])
  if (!storageConfigured()) return { ok: false, error: 'Video storage (Cloudflare R2) is not connected yet, so there is nowhere to upload the test video.' }
  if (input.contentType !== 'video/mp4') return { ok: false, error: 'Use an MP4 video.' }
  if (input.size > TIKTOK_MAX_SINGLE_UPLOAD) return { ok: false, error: 'Use a video of 64 MB or less for the test.' }
  const key = `${PREFIX}${randomBytes(8).toString('hex')}.mp4`
  return { ok: true, url: await uploadUrl(key, 'video/mp4'), key }
}

export async function discardTestUpload(key: string): Promise<void> {
  await requireUser(['ADMIN'])
  if (validKey(key)) await removeObject(key).catch(() => undefined)
}

// ---- TikTok ----

/** Who it will post as and which privacy levels are allowed, shown before posting. */
export async function tiktokTestInfo(): Promise<{ ok: true; username: string | null; nickname: string | null; privacyOptions: string[]; maxDurationSec: number | null } | Fail> {
  await requireUser(['ADMIN'])
  try {
    return { ok: true, ...(await tiktokCreatorInfo()) }
  } catch (e) {
    return { ok: false, error: message(e, 'TikTok did not answer') }
  }
}

/** Step 2: send the uploaded file to TikTok as a direct post. */
export async function tiktokTestPost(input: { key: string; caption: string; privacy: string }): Promise<{ ok: true; publishId: string } | Fail> {
  await requireUser(['ADMIN'])
  if (!validKey(input.key)) return { ok: false, error: 'Invalid upload.' }
  try {
    const info = await tiktokCreatorInfo()
    if (!info.privacyOptions.includes(input.privacy)) return { ok: false, error: `TikTok doesn't allow "${input.privacy}" for this account right now.` }
    if (!(await objectInfo(input.key))) return { ok: false, error: 'The upload was not found. Try again.' }
    const res = await fetch(await playUrl(input.key, 'video/mp4', 600))
    if (!res.ok) return { ok: false, error: `Couldn't read the uploaded video (${res.status}).` }
    const publishId = await tiktokDirectPost(await res.arrayBuffer(), input.caption, input.privacy)
    return { ok: true, publishId }
  } catch (e) {
    return { ok: false, error: message(e, 'TikTok refused the video') }
  } finally {
    await removeObject(input.key).catch(() => undefined)
  }
}

/** Step 3 (polled): where TikTok is with it. */
export async function tiktokTestStatus(publishId: string): Promise<{ ok: true; status: string; postId: string | null } | Fail> {
  await requireUser(['ADMIN'])
  try {
    const s = await tiktokPostStatus(publishId)
    if (s.status === 'FAILED') return { ok: false, error: `TikTok couldn't post it: ${s.failReason ?? 'unknown reason'}` }
    return { ok: true, status: s.status, postId: s.postId }
  } catch (e) {
    return { ok: false, error: message(e, 'TikTok status check failed') }
  }
}

// ---- Instagram ----

/** Step 2: Instagram fetches the uploaded file (1-hour private link) and starts processing it as a reel. */
export async function instagramTestPost(input: { key: string; caption: string }): Promise<{ ok: true; containerId: string } | Fail> {
  await requireUser(['ADMIN'])
  if (!validKey(input.key)) return { ok: false, error: 'Invalid upload.' }
  try {
    if (!(await objectInfo(input.key))) return { ok: false, error: 'The upload was not found. Try again.' }
    return { ok: true, containerId: await createReelContainer(await playUrl(input.key, 'video/mp4', 3600), input.caption.slice(0, 2200)) }
  } catch (e) {
    await removeObject(input.key).catch(() => undefined)
    return { ok: false, error: message(e, 'Instagram refused the video') }
  }
}

/** Step 3 (polled): publishes as soon as Instagram has processed it, then removes the test file. */
export async function instagramTestStatus(input: { key: string; containerId: string }): Promise<{ ok: true; status: 'processing' | 'posted'; permalink: string | null } | Fail> {
  await requireUser(['ADMIN'])
  const cleanup = (): Promise<void> => (validKey(input.key) ? removeObject(input.key).catch(() => undefined) : Promise.resolve())
  try {
    const s = await containerStatus(input.containerId)
    if (s.status === 'FINISHED') {
      const p = await publishContainer(input.containerId)
      await cleanup()
      return { ok: true, status: 'posted', permalink: p.permalink }
    }
    if (s.status === 'ERROR' || s.status === 'EXPIRED') {
      await cleanup()
      return { ok: false, error: `Instagram couldn't process it: ${s.message ?? s.status}` }
    }
    return { ok: true, status: 'processing', permalink: null }
  } catch (e) {
    return { ok: false, error: message(e, 'Instagram check failed') }
  }
}
