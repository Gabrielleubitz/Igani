import { describe, expect, it } from 'vitest'
import { MAX_ATTEMPTS, WAIT_MS, reviewState, type ReviewCall } from '@/lib/review-status'
import { NOT_CONNECTED_MESSAGE, SHORT_CALL_MESSAGE } from '@/lib/call-review-rules'

const now = new Date('2026-11-12T12:00:00Z')
const mins = (n: number): Date => new Date(now.getTime() - n * 60_000)
const call = (over: Partial<ReviewCall> = {}): ReviewCall => ({
  userId: 'rep',
  private: false,
  simulated: false,
  startedAt: mins(8),
  endedAt: mins(3),
  answeredAt: mins(7),
  durationSec: 300,
  recordingSec: null,
  recordingStatus: null,
  analysisStatus: null,
  analysisError: null,
  analysisAttempts: 0,
  ...over,
})
const st = (c: ReviewCall, viewer = 'rep', readable = true) => reviewState(c, viewer, now, readable)

describe('reviewState', () => {
  it('waits for a long answered call that has no review yet', () => {
    expect(st(call()).state).toBe('waiting')
    expect(st(call({ analysisStatus: 'pending' })).state).toBe('waiting')
    expect(st(call({ analysisStatus: 'processing' })).state).toBe('waiting')
  })

  it('is ready only when the review exists and can be read', () => {
    expect(st(call({ analysisStatus: 'ready' })).state).toBe('ready')
    const unreadable = st(call({ analysisStatus: 'ready' }), 'rep', false)
    expect(unreadable).toMatchObject({ state: 'failed', willRetry: true })
  })

  it('says unavailable, never failed, when nothing appeared in the waiting window', () => {
    const late = st(call({ endedAt: mins(61), startedAt: mins(66) }))
    expect(late.state).toBe('unavailable')
    expect(late.message).not.toMatch(/fail|couldn’t complete/i)
    expect(st(call({ endedAt: mins(61), startedAt: mins(66), analysisStatus: 'pending' })).state).toBe('unavailable')
    expect(st(call({ endedAt: mins(59), startedAt: mins(64) })).state).toBe('waiting')
    expect(WAIT_MS).toBe(60 * 60_000)
  })

  it('keeps the explicit failure separate, and says whether a retry is still to come', () => {
    const retry = st(call({ analysisStatus: 'failed', analysisAttempts: 1, analysisError: 'OpenAI is busy' }))
    expect(retry).toMatchObject({ state: 'failed', willRetry: true })
    expect(retry.message).toMatch(/try again automatically/)
    const final = st(call({ analysisStatus: 'failed', analysisAttempts: MAX_ATTEMPTS, analysisError: 'OpenAI is busy' }))
    expect(final).toMatchObject({ state: 'failed', willRetry: false })
    expect(final.message).toMatch(/couldn’t complete/)
  })

  it('is skipped at once for a short call, and uses the stored reason otherwise', () => {
    expect(st(call({ durationSec: 90 }))).toMatchObject({ state: 'skipped', message: SHORT_CALL_MESSAGE })
    expect(st(call({ analysisStatus: 'skipped', analysisError: 'Nothing was said on the recording.' }))).toMatchObject({ state: 'skipped', message: 'Nothing was said on the recording.' })
    expect(st(call({ analysisStatus: 'skipped' })).message).toBe(SHORT_CALL_MESSAGE)
    // a short call that is already being analysed (an admin forced it) is not called skipped
    expect(st(call({ durationSec: 90, analysisStatus: 'processing' })).state).toBe('waiting')
    // an unknown length is not treated as short
    expect(st(call({ durationSec: null, recordingSec: null })).state).toBe('waiting')
  })

  it('expects nothing for a call that did not connect, has no recording, or is private or simulated', () => {
    expect(st(call({ answeredAt: null, durationSec: 0 }))).toMatchObject({ state: 'none', message: NOT_CONNECTED_MESSAGE })
    expect(st(call({ recordingStatus: 'absent' })).state).toBe('none')
    expect(st(call({ private: true })).state).toBe('none')
    expect(st(call({ simulated: true })).state).toBe('none')
  })

  it('reveals nothing about a call that is not the viewer’s own (an admin included)', () => {
    const other = call({ userId: 'someone-else', analysisStatus: 'ready' })
    expect(st(other, 'rep')).toEqual({ state: 'none' })
    expect(st(other, 'admin')).toEqual({ state: 'none' })
    expect(st(call({ userId: null }))).toEqual({ state: 'none' })
  })

  it('does not change its input', () => {
    const c = call({ analysisStatus: 'failed', analysisAttempts: 1 })
    const copy = JSON.stringify(c)
    st(c)
    expect(JSON.stringify(c)).toBe(copy)
  })
})
