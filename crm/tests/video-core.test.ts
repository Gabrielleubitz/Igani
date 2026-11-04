import { describe, expect, it } from 'vitest'
import { MAX_VIDEO_BYTES, TOTAL_VIDEO_BYTES, canWatch, fitsLimits, isVideoId, parseRange, parseVideo, sliceStream, type VideoRecord } from '@/lib/video-core'

const base: VideoRecord = { id: 'abc12345', title: 'Demo', pathname: 'videos/demo.mp4', size: 1000, contentType: 'video/mp4', visibility: 'team', offerId: null, createdAt: '' }
const offerVideo: VideoRecord = { ...base, visibility: 'offer', offerId: 'o1' }

describe('who can watch', () => {
  it('team videos need a signed-in user', () => {
    expect(canWatch(base, null, null)).toBe(false)
    expect(canWatch(base, { role: 'SALES' }, null)).toBe(true)
  })
  it('offer videos play only on their own live or signed offer', () => {
    expect(canWatch(offerVideo, null, { id: 'o1', status: 'LIVE' })).toBe(true)
    expect(canWatch(offerVideo, null, { id: 'o1', status: 'SIGNED' })).toBe(true)
    expect(canWatch(offerVideo, null, { id: 'o1', status: 'DRAFT' })).toBe(false)
    expect(canWatch(offerVideo, null, { id: 'o1', status: 'ARCHIVED' })).toBe(false)
    expect(canWatch(offerVideo, null, { id: 'o2', status: 'LIVE' })).toBe(false)
    expect(canWatch(offerVideo, null, null)).toBe(false)
    expect(canWatch(offerVideo, { role: 'SALES' }, null)).toBe(false)
  })
  it('admins watch everything', () => {
    expect(canWatch(offerVideo, { role: 'ADMIN' }, null)).toBe(true)
  })
})

describe('records and limits', () => {
  it('parses and rejects records', () => {
    expect(parseVideo('x', { title: 'a', pathname: 'p', size: 1, visibility: 'team' })).toMatchObject({ id: 'x', visibility: 'team' })
    expect(parseVideo('x', { title: 'a', pathname: 'p', size: 1, visibility: 'public' })).toBeNull()
    expect(isVideoId('../x')).toBe(false)
  })
  it('enforces type, per-file and total size', () => {
    expect(fitsLimits(1000, 'video/mp4', 0)).toBeNull()
    expect(fitsLimits(1000, 'application/pdf', 0)).toMatch(/MP4/)
    expect(fitsLimits(MAX_VIDEO_BYTES + 1, 'video/mp4', 0)).toMatch(/150 MB/)
    expect(fitsLimits(MAX_VIDEO_BYTES, 'video/mp4', TOTAL_VIDEO_BYTES - 10)).toMatch(/1 GB/)
  })
})

describe('Range', () => {
  it('parses ranges', () => {
    expect(parseRange(null, 100)).toBeNull()
    expect(parseRange('bytes=0-49', 100)).toEqual({ start: 0, end: 49 })
    expect(parseRange('bytes=50-', 100)).toEqual({ start: 50, end: 99 })
    expect(parseRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 })
    expect(parseRange('bytes=0-999', 100)).toEqual({ start: 0, end: 99 })
    expect(parseRange('bytes=100-', 100)).toBe('invalid')
    expect(parseRange('bytes=9-3', 100)).toBe('invalid')
  })
  it('slices a stream to the requested bytes', async () => {
    const src = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array([0, 1, 2, 3]))
        c.enqueue(new Uint8Array([4, 5, 6, 7]))
        c.enqueue(new Uint8Array([8, 9]))
        c.close()
      },
    })
    const out: number[] = []
    const r = sliceStream(src, 2, 8).getReader()
    for (;;) {
      const { done, value } = await r.read()
      if (done) break
      out.push(...value)
    }
    expect(out).toEqual([2, 3, 4, 5, 6, 7, 8])
  })
})
