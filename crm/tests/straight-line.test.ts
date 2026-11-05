import { describe, expect, it } from 'vitest'
import { LESSON_INDEX, LESSON_INDEX_PROMPT, STRAIGHT_LINE_CHECKS, STRAIGHT_LINE_PLAYBOOK, snapLesson } from '@/lib/straight-line'

describe('Straight Line playbook and index', () => {
  it('has all ten episodes in the index, in order, with sane times', () => {
    for (let ep = 1; ep <= 10; ep++) {
      const list = LESSON_INDEX.filter((l) => l.ep === ep)
      expect(list.length).toBeGreaterThanOrEqual(8)
      expect(list.map((l) => l.startSec)).toEqual([...list.map((l) => l.startSec)].sort((a, b) => a - b))
      expect(list.every((l) => l.startSec >= 0 && l.startSec < 7000)).toBe(true)
    }
    expect(LESSON_INDEX_PROMPT.split('\n')).toHaveLength(LESSON_INDEX.length)
  })
  it('snaps a lesson to the nearest real entry of that episode', () => {
    expect(snapLesson(3, 1580)).toMatchObject({ ep: 3, startSec: 1574 })
    expect(snapLesson(8, 99999)?.ep).toBe(8)
    expect(snapLesson(99, 10)).toBeNull()
  })
  it('keeps the ethics guard in the playbook and has unique check ids', () => {
    expect(STRAIGHT_LINE_PLAYBOOK).toMatch(/Ethics/)
    expect(STRAIGHT_LINE_PLAYBOOK).toMatch(/Never pressure/)
    expect(new Set(STRAIGHT_LINE_CHECKS.map((c) => c.id)).size).toBe(STRAIGHT_LINE_CHECKS.length)
  })
})
