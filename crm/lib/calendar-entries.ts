import { z } from 'zod'
import { zonedInputToDate } from './time'

/** Colors an entry can have (the CSS vars are defined in globals.css). */
export const ENTRY_COLORS = ['blue', 'emerald', 'violet', 'amber', 'rose'] as const
export type EntryColor = (typeof ENTRY_COLORS)[number]

export const entryColorVar = (c: string | null | undefined): string => `var(--color-${ENTRY_COLORS.find((x) => x === c) ?? 'blue'}-500)`

const when = z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/, 'Pick a valid date')

export const entryInput = z.object({
  title: z.string().trim().min(1, 'Give the event a title').max(200),
  notes: z.string().trim().max(2000).optional(),
  allDay: z.boolean(),
  start: when,
  end: when,
  color: z.enum(ENTRY_COLORS).optional(),
})
export type EntryInput = z.infer<typeof entryInput>

/**
 * Turns the form values (wall-clock strings in the user's time zone) into stored instants.
 * All-day entries run from local midnight of the first day to local midnight after the last day (end is exclusive).
 */
export function resolveEntryTimes(i: Pick<EntryInput, 'allDay' | 'start' | 'end'>, timeZone: string): { startTime: Date; endTime: Date } {
  const day = (v: string): string => v.slice(0, 10)
  const startTime = zonedInputToDate(i.allDay ? `${day(i.start)}T00:00` : i.start, timeZone)
  let endTime: Date
  if (i.allDay) {
    const last = zonedInputToDate(`${day(i.end)}T00:00`, timeZone)
    // next local midnight: noon of the last day + 24h lands on the next day in every zone; re-anchor it to midnight.
    const next = new Date(last.getTime() + 36 * 3600_000)
    const nd = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(next)
    endTime = zonedInputToDate(`${nd}T00:00`, timeZone)
  } else {
    endTime = zonedInputToDate(i.end, timeZone)
  }
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) throw new Error('Pick a valid date')
  if (endTime.getTime() <= startTime.getTime()) throw new Error('The end must be after the start')
  return { startTime, endTime }
}
