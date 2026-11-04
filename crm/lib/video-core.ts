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

export type Viewer = { role: 'ADMIN' | 'SALES' | 'MARKETING' } | null
export type OfferRef = { id: string; status: string } | null

/**
 * Who may watch. Signed-in team members watch 'team' videos; admins watch everything.
 * An 'offer' video plays only on that offer's own page while the offer is live or signed (never for drafts/archived).
 */
export function canWatch(video: VideoRecord, viewer: Viewer, offer: OfferRef): boolean {
  if (viewer?.role === 'ADMIN') return true
  if (video.visibility === 'team') return viewer !== null
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
