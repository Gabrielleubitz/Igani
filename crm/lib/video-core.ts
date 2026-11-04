/** Private videos: records, limits, access rule and Range parsing. Pure (no server imports) so it can be unit-tested. */

export const VIDEO_PREFIX = 'video:'
export const MAX_VIDEO_BYTES = 250 * 1024 * 1024
export const TOTAL_VIDEO_BYTES = 1024 * 1024 * 1024
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const

export interface VideoRecord {
  id: string
  title: string
  /** pathname in the private Blob store */
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
  if (size > MAX_VIDEO_BYTES) return 'This file is over 250 MB. Compress it first (720p, quality 28) and try again.'
  if (used + size > TOTAL_VIDEO_BYTES) return 'Not enough space: the library is limited to 1 GB. Delete a video first.'
  return null
}

/** Passes through bytes start..end (inclusive) of a stream. */
export function sliceStream(src: ReadableStream<Uint8Array>, start: number, end: number): ReadableStream<Uint8Array> {
  let pos = 0
  const reader = src.getReader()
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      for (;;) {
        const { done, value } = await reader.read()
        if (done || pos > end) {
          controller.close()
          void reader.cancel().catch(() => undefined)
          return
        }
        const chunkStart = pos
        pos += value.length
        if (pos <= start) continue
        const from = Math.max(0, start - chunkStart)
        const to = Math.min(value.length, end - chunkStart + 1)
        if (to > from) {
          controller.enqueue(value.subarray(from, to))
          if (pos > end) {
            controller.close()
            void reader.cancel().catch(() => undefined)
          }
          return
        }
      }
    },
    cancel: () => reader.cancel(),
  })
}
