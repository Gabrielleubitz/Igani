import { describe, expect, it } from 'vitest'
import { entryInput, resolveEntryTimes } from '@/lib/calendar-entries'

describe('calendar entries', () => {
  it('timed entry converts wall-clock to instants in the zone', () => {
    const r = resolveEntryTimes({ allDay: false, start: '2026-11-02T09:00', end: '2026-11-02T10:30' }, 'America/New_York')
    expect(r.startTime.toISOString()).toBe('2026-11-02T14:00:00.000Z')
    expect(r.endTime.toISOString()).toBe('2026-11-02T15:30:00.000Z')
  })
  it('all-day entry ends at the midnight after the last day (exclusive), across DST', () => {
    const r = resolveEntryTimes({ allDay: true, start: '2026-11-01', end: '2026-11-01' }, 'America/New_York')
    expect(r.startTime.toISOString()).toBe('2026-11-01T04:00:00.000Z')
    expect(r.endTime.toISOString()).toBe('2026-11-02T05:00:00.000Z')
  })
  it('rejects end before start and empty titles', () => {
    expect(() => resolveEntryTimes({ allDay: false, start: '2026-11-02T10:00', end: '2026-11-02T09:00' }, 'UTC')).toThrow()
    expect(entryInput.safeParse({ title: '  ', allDay: false, start: '2026-11-02T10:00', end: '2026-11-02T11:00' }).success).toBe(false)
  })
})
