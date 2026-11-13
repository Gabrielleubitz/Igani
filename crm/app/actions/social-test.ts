'use server'

import { randomBytes } from 'node:crypto'
import { requireUser } from '@/lib/auth'
import { objectInfo, playUrl, removeObject, storageConfigured, uploadUrl } from '@/lib/video'
import { containerStatus, createReelContainer, publishContainer } from '@/lib/instagram'
import { TIKTOK_MAX_SINGLE_UPLOAD, tiktokCreatorInfo, tiktokDirectPost, tiktokPostStatus } from '@/lib/tiktok'
import { getResearch, refreshResearch, rememberPost, saveResearch, writePost } from '@/lib/social-content'
import type { SocialDraft } from '@/lib/social-draft'

/**
 * "Post now" on the TikTok and Instagram cards in Admin → Settings: the post (video script, caption, hashtags) is written
 * from the saved research brief, the browser renders the video, the admin checks it, and it is posted straight away.
 * Video files live under `social-tests/` in the private bucket and are removed once the platform has them.
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

type PostMeta = Pick<SocialDraft, 'topic' | 'hook' | 'visual'> | null | undefined
const remember = (meta: PostMeta, platform: 'tiktok' | 'instagram'): Promise<void> => (meta ? rememberPost({ ...meta, platform }).catch(() => undefined) : Promise.resolve())

// ---- writing the post ----

/** Writes a new post from the saved research (researching once first if there is no brief yet). */
export async function generateSocialPost(platform: 'tiktok' | 'instagram'): Promise<{ ok: true; draft: SocialDraft; researchAt: number } | Fail> {
  await requireUser(['ADMIN'])
  try {
    return { ok: true, ...(await writePost(platform)) }
  } catch (e) {
    return { ok: false, error: message(e, 'Could not write the post') }
  }
}

export async function socialResearchInfo(): Promise<{ ok: true; createdAt: number | null }> {
  await requireUser(['ADMIN'])
  return { ok: true, createdAt: (await getResearch())?.createdAt ?? null }
}

export async function refreshSocialResearch(): Promise<{ ok: true; text: string; createdAt: number } | Fail> {
  await requireUser(['ADMIN'])
  try {
    const r = await refreshResearch()
    return { ok: true, text: r.text, createdAt: r.createdAt }
  } catch (e) {
    return { ok: false, error: message(e, 'The research failed') }
  }
}

export async function saveSocialResearch(text: string): Promise<{ ok: true; createdAt: number } | Fail> {
  const user = await requireUser(['ADMIN'])
  if (text.trim().length < 50) return { ok: false, error: 'The research brief is too short.' }
  const r = await saveResearch(text, user.id)
  return { ok: true, createdAt: r.createdAt }
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
export async function tiktokTestPost(input: { key: string; caption: string; privacy: string; meta?: PostMeta }): Promise<{ ok: true; publishId: string } | Fail> {
  await requireUser(['ADMIN'])
  if (!validKey(input.key)) return { ok: false, error: 'Invalid upload.' }
  try {
    const info = await tiktokCreatorInfo()
    if (!info.privacyOptions.includes(input.privacy)) return { ok: false, error: `TikTok doesn't allow "${input.privacy}" for this account right now.` }
    if (!(await objectInfo(input.key))) return { ok: false, error: 'The upload was not found. Try again.' }
    const res = await fetch(await playUrl(input.key, 'video/mp4', 600))
    if (!res.ok) return { ok: false, error: `Couldn't read the uploaded video (${res.status}).` }
    const publishId = await tiktokDirectPost(await res.arrayBuffer(), input.caption, input.privacy)
    await remember(input.meta, 'tiktok')
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
export async function instagramTestPost(input: { key: string; caption: string; meta?: PostMeta }): Promise<{ ok: true; containerId: string } | Fail> {
  await requireUser(['ADMIN'])
  if (!validKey(input.key)) return { ok: false, error: 'Invalid upload.' }
  try {
    if (!(await objectInfo(input.key))) return { ok: false, error: 'The upload was not found. Try again.' }
    const containerId = await createReelContainer(await playUrl(input.key, 'video/mp4', 3600), input.caption.slice(0, 2200))
    await remember(input.meta, 'instagram')
    return { ok: true, containerId }
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
