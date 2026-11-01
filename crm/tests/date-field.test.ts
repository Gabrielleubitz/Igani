import { describe, expect, it } from 'vitest'
import { resolveYear } from '../lib/date-field'

describe('year for a day and month typed without one', () => {
  const today = new Date(2026, 9, 31) // 31 Oct 2026
  it('is the current year for today and later this year', () => {
    expect(resolveYear(today, 9, 31)).toBe(2026)
    expect(resolveYear(today, 11, 5)).toBe(2026)
  })
  it('rolls to next year once the date has passed this year', () => {
    expect(resolveYear(today, 0, 7)).toBe(2027)
    expect(resolveYear(today, 9, 30)).toBe(2027)
  })
})
