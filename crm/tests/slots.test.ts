import { describe, expect, it } from 'vitest'
import { computeSlots, mergeIntervals, parseHHmm, windowsForDate, zonedWallTimeToUtc } from '@/lib/slots'

const d = (iso: string): Date => new Date(iso)

describe('time zone conversion', () => {
  it('converts wall time in Asia/Jerusalem (UTC+2 in winter, +3 in summer)', () => {
    expect(zonedWallTimeToUtc(2026, 11, 2, 9 * 60, 'Asia/Jerusalem').toISOString()).toBe('2026-12-02T07:00:00.000Z')
    expect(zonedWallTimeToUtc(2026, 6, 2, 9 * 60, 'Asia/Jerusalem').toISOString()).toBe('2026-07-02T06:00:00.000Z')
  })
  it('handles the US DST switch day', () => {
    // 2026-03-08: clocks jump 02:00 → 03:00 in New York; 09:00 is EDT (UTC-4)
    expect(zonedWallTimeToUtc(2026, 2, 8, 9 * 60, 'America/New_York').toISOString()).toBe('2026-03-08T13:00:00.000Z')
    expect(zonedWallTimeToUtc(2026, 2, 7, 9 * 60, 'America/New_York').toISOString()).toBe('2026-03-07T14:00:00.000Z')
  })
  it('rejects malformed times', () => {
    expect(() => parseHHmm('9:00')).toThrow()
    expect(parseHHmm('24:00')).toBe(1440)
  })
})

describe('windowsForDate', () => {
  it('builds and merges windows for the civil date', () => {
    const w = windowsForDate(d('2026-11-02'), [
      { startTime: '09:00', endTime: '12:00' },
      { startTime: '11:00', endTime: '13:00' },
      { startTime: '14:00', endTime: '14:00' },
    ], 'UTC')
    expect(w).toEqual([{ start: d('2026-11-02T09:00:00Z'), end: d('2026-11-02T13:00:00Z') }])
  })
})

describe('computeSlots', () => {
  const windows = [{ start: d('2026-11-02T09:00:00Z'), end: d('2026-11-02T11:00:00Z') }]
  const now = d('2026-11-01T00:00:00Z')

  it('returns back-to-back non-overlapping slots', () => {
    expect(computeSlots({ windows, busy: [], durationMinutes: 30, now })).toEqual([
      '2026-11-02T09:00:00.000Z',
      '2026-11-02T09:30:00.000Z',
      '2026-11-02T10:00:00.000Z',
      '2026-11-02T10:30:00.000Z',
    ])
  })
  it('drops slots intersecting busy time but keeps touching ones', () => {
    const busy = [{ start: d('2026-11-02T09:30:00Z'), end: d('2026-11-02T10:15:00Z') }]
    expect(computeSlots({ windows, busy, durationMinutes: 30, now })).toEqual(['2026-11-02T09:00:00.000Z', '2026-11-02T10:30:00.000Z'])
  })
  it('respects minimum notice', () => {
    const slots = computeSlots({ windows, busy: [], durationMinutes: 60, now: d('2026-11-02T08:30:00Z'), minNoticeMinutes: 60 })
    expect(slots).toEqual(['2026-11-02T10:00:00.000Z'])
  })
  it('never returns a slot that overruns the window', () => {
    expect(computeSlots({ windows, busy: [], durationMinutes: 45, now })).toEqual(['2026-11-02T09:00:00.000Z', '2026-11-02T09:45:00.000Z'])
  })
  it('validates duration', () => {
    expect(() => computeSlots({ windows, busy: [], durationMinutes: 0, now })).toThrow()
  })
  it('merges overlapping busy intervals', () => {
    expect(mergeIntervals([
      { start: d('2026-11-02T10:00:00Z'), end: d('2026-11-02T11:00:00Z') },
      { start: d('2026-11-02T09:00:00Z'), end: d('2026-11-02T10:30:00Z') },
    ])).toEqual([{ start: d('2026-11-02T09:00:00Z'), end: d('2026-11-02T11:00:00Z') }])
  })
})
