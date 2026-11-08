import { describe, expect, it } from 'vitest'
import { MAX_PAST_CALL_BYTES, pastCallDate, pastCallFileError } from '@/lib/past-call'

describe('adding a past call', () => {
  it('accepts a small audio file, by type or by extension', () => {
    expect(pastCallFileError({ name: 'x.m4a', size: 900_000, type: '' })).toBeNull()
    expect(pastCallFileError({ name: 'x', size: 900_000, type: 'audio/mpeg' })).toBeNull()
  })
  it('refuses empty, oversize and non-audio files', () => {
    expect(pastCallFileError({ name: 'x.m4a', size: 0 })).toMatch(/empty/)
    expect(pastCallFileError({ name: 'x.m4a', size: MAX_PAST_CALL_BYTES + 1 })).toMatch(/MB/)
    expect(pastCallFileError({ name: 'x.pdf', size: 100, type: 'application/pdf' })).toMatch(/audio/)
  })
  it('reads the call date, refusing nonsense and the future', () => {
    const now = new Date('2026-11-09T10:00:00Z')
    expect(pastCallDate('', now)).toEqual(now)
    expect(pastCallDate('2026-11-05', now)?.toISOString().slice(0, 10)).toBe('2026-11-05')
    expect(pastCallDate('2026-02-31', now)).toBeNull()
    expect(pastCallDate('2026-12-01', now)).toBeNull()
    expect(pastCallDate('yesterday', now)).toBeNull()
  })
})
