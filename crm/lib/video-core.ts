/** Private videos: records, limits, access rule and Range parsing. Pure (no server imports) so it can be unit-tested. */

export const VIDEO_PREFIX = 'video:'
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024
/** Cloudflare R2 free tier is 10 GB; stay a little under it */
export const TOTAL_VIDEO_BYTES = 9 * 1024 * 1024 * 1024
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const

export interface VideoRecord {
  id: string
  title: string
  /** object key in the private R2 bucket */
  pathname: string
  size: number
  contentType: string
  /** 'team' = any signed-in CRM user; 'offer' = only visitors of that offer's page (and admins) */
  visibility: 'team' | 'offer'
  offerId: string | null
  createdAt: string
}

export const videoKey = (id: string): string => `${VIDEO_PREFIX}${id}`
export const isVideoId = (s: string): boolean => /^[A-Za-z0-9_-]{8,40}$/.test(s)

export function parseVideo(id: string, value: unknown): VideoRecord | null {
  const v = value as Partial<VideoRecord> | null
  if (!v || typeof v.title !== 'string' || typeof v.pathname !== 'string' || typeof v.size !== 'number') return null
  if (v.visibility !== 'team' && v.visibility !== 'offer') return null
  return { id, title: v.title, pathname: v.pathname, size: v.size, contentType: v.contentType ?? 'video/mp4', visibility: v.visibility, offerId: v.offerId ?? null, createdAt: v.createdAt ?? '' }
}

/** `unlocked` = the team video ids this person may play; only enforced for salespeople (the course is gated for them). */
export type Viewer = { role: 'ADMIN' | 'SALES' | 'MARKETING'; unlocked?: readonly string[] } | null
export type OfferRef = { id: string; status: string } | null

/**
 * Who may watch. Signed-in team members watch 'team' videos; admins watch everything.
 * An 'offer' video plays only on that offer's own page while the offer is live or signed (never for drafts/archived).
 */
export function canWatch(video: VideoRecord, viewer: Viewer, offer: OfferRef): boolean {
  if (viewer?.role === 'ADMIN') return true
  if (video.visibility === 'team') return viewer !== null && (viewer.role !== 'SALES' || (viewer.unlocked ?? []).includes(video.id))
  return offer !== null && video.offerId === offer.id && (offer.status === 'LIVE' || offer.status === 'SIGNED')
}

/** Parses a single `bytes=a-b` Range header against a file size; null = no/ignored range, 'invalid' = unsatisfiable. */
export function parseRange(header: string | null, size: number): { start: number; end: number } | null | 'invalid' {
  if (!header) return null
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!m) return null
  let start: number
  let end: number
  if (m[1] === '' && m[2] === '') return 'invalid'
  if (m[1] === '') {
    const n = Number(m[2])
    if (n === 0) return 'invalid'
    start = Math.max(0, size - n)
    end = size - 1
  } else {
    start = Number(m[1])
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1)
  }
  if (start >= size || start > end) return 'invalid'
  return { start, end }
}

export function usedBytes(videos: VideoRecord[]): number {
  return videos.reduce((n, v) => n + v.size, 0)
}

export function fitsLimits(size: number, type: string, used: number): string | null {
  if (!(VIDEO_TYPES as readonly string[]).includes(type)) return 'Upload an MP4, WebM or MOV video.'
  if (size > MAX_VIDEO_BYTES) return 'This file is over 500 MB. Compress it a little (720p) and try again.'
  if (used + size > TOTAL_VIDEO_BYTES) return 'Not enough space: the library is limited to 9 GB (the free tier). Delete a video first.'
  return null
}

// ─── Course progress (salespeople unlock the team videos one at a time) ─────

export const PROGRESS_PREFIX = 'videoProgress:'
export const progressKey = (userId: string): string => `${PROGRESS_PREFIX}${userId}`

export interface Progress {
  /** video ids finished, in the order they were finished */
  completed: string[]
  /** when each video was first played (epoch ms): a lesson cannot be completed faster than real time */
  started: Record<string, number>
}

export const emptyProgress = (): Progress => ({ completed: [], started: {} })

export function parseProgress(value: unknown): Progress {
  const v = value as Partial<Progress> | null
  return {
    completed: Array.isArray(v?.completed) ? v.completed.filter((x): x is string => typeof x === 'string') : [],
    started: v?.started && typeof v.started === 'object' ? Object.fromEntries(Object.entries(v.started).filter(([, t]) => typeof t === 'number')) : {},
  }
}

/** The team videos in course order: by title, numbers compared as numbers (01, 02 … 10). */
export function courseOrder<T extends { title: string; visibility: string }>(videos: T[]): T[] {
  return videos.filter((v) => v.visibility === 'team').sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }))
}

/** Completed lessons plus the first one not yet completed. Later lessons stay locked. */
export function unlockedIds(orderedIds: string[], completed: readonly string[]): string[] {
  const done = new Set(completed)
  const out: string[] = []
  for (const id of orderedIds) {
    out.push(id)
    if (!done.has(id)) break
  }
  return out
}

/** A lesson counts as finished only if most of it was played, and enough real time has passed since it was first started. */
export function canComplete(startedAt: number | undefined, now: number, durationSec: number, watchedSec: number): boolean {
  if (!startedAt || !(durationSec > 0) || !(watchedSec >= 0)) return false
  if (watchedSec < durationSec * 0.9) return false
  return now - startedAt >= durationSec * 0.8 * 1000
}
