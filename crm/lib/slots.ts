/** Pure scheduling math (no I/O) — unit tested in tests/slots.test.ts. */

export interface Interval {
  start: Date
  end: Date
}

export interface WorkingWindow {
  /** "HH:mm" wall-clock time in the host's zone */
  startTime: string
  endTime: string
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$|^24:00$/

export function parseHHmm(value: string): number {
  const m = HHMM.exec(value)
  if (!m) throw new Error(`Invalid time "${value}" (expected HH:mm)`)
  if (value === '24:00') return 24 * 60
  return Number(m[1]) * 60 + Number(m[2])
}

/** Offset (ms) of `timeZone` from UTC at the given instant. */
export function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const get = (type: Intl.DateTimeFormatPartTypes): number => Number(parts.find((p) => p.type === type)?.value ?? 0)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - (instant.getTime() - instant.getMilliseconds())
}

/** UTC instant for a wall-clock time on a civil date in `timeZone` (DST-safe). */
export function zonedWallTimeToUtc(year: number, month: number, day: number, minutes: number, timeZone: string): Date {
  const guess = Date.UTC(year, month, day, 0, minutes)
  const first = guess - zoneOffsetMs(new Date(guess), timeZone)
  const second = guess - zoneOffsetMs(new Date(first), timeZone)
  return new Date(second)
}

/** Civil date (Y/M/D) of a Date, read in UTC — callers pass midnight-UTC dates like `new Date('2026-11-02')`. */
export function civilDate(date: Date): { year: number; month: number; day: number; dayOfWeek: number } {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate(), dayOfWeek: date.getUTCDay() }
}

/** Working windows for one civil date, converted to UTC intervals. Overlapping windows are merged. */
export function windowsForDate(date: Date, windows: readonly WorkingWindow[], timeZone: string): Interval[] {
  const { year, month, day } = civilDate(date)
  const intervals = windows
    .map((w) => {
      const startMin = parseHHmm(w.startTime)
      const endMin = parseHHmm(w.endTime)
      if (endMin <= startMin) return null
      return {
        start: zonedWallTimeToUtc(year, month, day, startMin, timeZone),
        end: zonedWallTimeToUtc(year, month, day, endMin, timeZone),
      }
    })
    .filter((i): i is Interval => i !== null)
  return mergeIntervals(intervals)
}

export function mergeIntervals(intervals: readonly Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime())
  const out: Interval[] = []
  for (const cur of sorted) {
    const last = out[out.length - 1]
    if (last && cur.start.getTime() <= last.end.getTime()) {
      if (cur.end.getTime() > last.end.getTime()) last.end = new Date(cur.end)
    } else {
      out.push({ start: new Date(cur.start), end: new Date(cur.end) })
    }
  }
  return out
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime()
}

export interface SlotOptions {
  windows: readonly Interval[]
  busy: readonly Interval[]
  durationMinutes: number
  /** Slots starting before now + minNoticeMinutes are dropped */
  now: Date
  minNoticeMinutes?: number
  /** Gap kept free around every busy interval */
  bufferMinutes?: number
}

/**
 * Back-to-back, non-overlapping slots of `durationMinutes` inside each working window,
 * skipping any slot that intersects a busy interval. Returns ISO start timestamps.
 */
export function computeSlots({ windows, busy, durationMinutes, now, minNoticeMinutes = 0, bufferMinutes = 0 }: SlotOptions): string[] {
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 480) {
    throw new Error('durationMinutes must be an integer between 5 and 480')
  }
  const step = durationMinutes * 60_000
  const earliest = now.getTime() + minNoticeMinutes * 60_000
  const pad = bufferMinutes * 60_000
  const mergedBusy = mergeIntervals(busy.map((b) => ({ start: new Date(b.start.getTime() - pad), end: new Date(b.end.getTime() + pad) })))
  const slots: string[] = []
  for (const w of mergeIntervals(windows)) {
    for (let t = w.start.getTime(); t + step <= w.end.getTime(); t += step) {
      if (t < earliest) continue
      const slot = { start: new Date(t), end: new Date(t + step) }
      if (!mergedBusy.some((b) => overlaps(slot, b))) slots.push(slot.start.toISOString())
    }
  }
  return slots
}
