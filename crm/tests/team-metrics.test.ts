import { describe, expect, it } from 'vitest'
import { conversionRate, isOpenTask, rankReps } from '../lib/team-metrics'

describe('team metrics', () => {
  it('win rate counts only decided leads', () => {
    expect(conversionRate(0, 0)).toBeNull()
    expect(conversionRate(1, 3)).toBe(25)
    expect(conversionRate(2, 1)).toBe(67)
  })

  it('a task is open for its assignee, or for the lead owner when unassigned', () => {
    expect(isOpenTask({ done: false, assigneeId: 'a' }, 'a', 'b')).toBe(true)
    expect(isOpenTask({ done: false, assigneeId: 'a' }, 'b', 'b')).toBe(false)
    expect(isOpenTask({ done: false, assigneeId: null }, 'b', 'b')).toBe(true)
    expect(isOpenTask({ done: true, assigneeId: 'a' }, 'a', 'a')).toBe(false)
  })

  it('ranks by revenue, then deals, then name', () => {
    const ranked = rankReps([
      { name: 'Cy', wonValue: 100, won: 1 },
      { name: 'Ann', wonValue: 500, won: 1 },
      { name: 'Bo', wonValue: 100, won: 3 },
      { name: 'Al', wonValue: 100, won: 1 },
    ])
    expect(ranked.map((r) => r.name)).toEqual(['Ann', 'Bo', 'Al', 'Cy'])
  })
})
