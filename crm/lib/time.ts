/** Time-zone aware day boundaries. The server runs in UTC; "today" must mean today where the user is. */

function partsIn(d: Date, timeZone: string): { y: number; m: number; day: number; h: number; min: number; s: number } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  )
  return { y: +p.year!, m: +p.month!, day: +p.day!, h: +p.hour!, min: +p.minute!, s: +p.second! }
}

/** Offset (ms) of `timeZone` from UTC at instant `d`. */
function offsetMs(d: Date, timeZone: string): number {
  const p = partsIn(d, timeZone)
  return Date.UTC(p.y, p.m - 1, p.day, p.h, p.min, p.s) - Math.floor(d.getTime() / 1000) * 1000
}

/** The UTC instant of local midnight starting the day `addDays` after `now`'s local date in `timeZone`. DST-safe. */
export function localMidnight(now: Date, timeZone: string, addDays = 0): Date {
  const p = partsIn(now, timeZone)
  const guess = Date.UTC(p.y, p.m - 1, p.day + addDays, 0, 0, 0)
  // Correct twice so a DST change between `now` and the target day is handled.
  let t = guess - offsetMs(new Date(guess), timeZone)
  t = guess - offsetMs(new Date(t), timeZone)
  return new Date(t)
}

export const startOfLocalDay = (now: Date, timeZone: string): Date => localMidnight(now, timeZone, 0)
export const endOfLocalDay = (now: Date, timeZone: string): Date => localMidnight(now, timeZone, 1)

/** Hour of day (0–23) at `now` in `timeZone`. */
export function localHour(now: Date, timeZone: string): number {
  return partsIn(now, timeZone).h
}

/** YYYY-MM-DD of `d` in `timeZone`. */
export function localDateKey(d: Date, timeZone: string): string {
  const p = partsIn(d, timeZone)
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/** UTC instant for a wall-clock time (YYYY-MM-DDTHH:mm, as a datetime-local input gives) in `timeZone`. */
export function zonedInputToDate(value: string, timeZone: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!m) return new Date(NaN)
  const guess = Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!)
  let t = guess - offsetMs(new Date(guess), timeZone)
  t = guess - offsetMs(new Date(t), timeZone)
  return new Date(t)
}

/** datetime-local value (YYYY-MM-DDTHH:mm) showing instant `d` as wall-clock time in `timeZone`. */
export function dateToZonedInput(d: Date, timeZone: string): string {
  const p = partsIn(d, timeZone)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${p.y}-${pad(p.m)}-${pad(p.day)}T${pad(p.h)}:${pad(p.min)}`
}
