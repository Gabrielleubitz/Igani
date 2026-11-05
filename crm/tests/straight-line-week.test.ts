import { describe, expect, it } from 'vitest'
import { lineDiscipline, normalizeLineMap, offLineStretches, thresholdSummary, type LineMap, type StageStatus } from '@/lib/line-map'
import { splitWeeks, summarizeWeek } from '@/lib/straight-line-week'

const map = (statuses: Partial<Record<string, StageStatus>>, path = [{ t: 0, offset: 0 }, { t: 100, offset: 0.4 }], peak = 6): LineMap => ({
  stages: Object.entries(statuses).map(([key, status]) => ({ key: key as never, status: status as StageStatus, at: 10, note: null })),
  path,
  threshold: { points: [{ t: 0, level: 2 }, { t: 100, level: peak }], actAt: 8 },
})

describe('line map helpers', () => {
  it('normalizes: known stages in order, one each, values clamped, nothing to draw -> null', () => {
    const m = normalizeLineMap({
      stages: [{ key: 'close', status: 'good', at: 50, note: ' ok ' }, { key: 'open', status: 'good', at: 1, note: null }, { key: 'open', status: 'blown', at: 2, note: null }, { key: 'nope', status: 'good', at: 1, note: null }, { key: 'bridge', status: 'weird', at: 1, note: null }],
      path: [{ t: 30, offset: 9 }, { t: 10, offset: -9 }],
      threshold: { points: [{ t: 5, level: 99 }], actAt: 1 },
    })
    expect(m?.stages.map((s) => s.key)).toEqual(['open', 'close'])
    expect(m?.path).toEqual([{ t: 10, offset: -2.5 }, { t: 30, offset: 2.5 }])
    expect(m?.threshold).toEqual({ points: [{ t: 5, level: 10 }], actAt: 4 })
    expect(normalizeLineMap({ stages: [], path: [], threshold: { points: [], actAt: 8 } })).toBeNull()
  })
  it('measures line discipline, off-line stretches and the threshold', () => {
    const path = [{ t: 0, offset: 0 }, { t: 60, offset: 0.5 }, { t: 90, offset: 2 }, { t: 150, offset: 2 }, { t: 180, offset: 0 }]
    expect(offLineStretches(path)).toEqual([[70, 165]])
    expect(lineDiscipline(path)).toBe(47)
    expect(lineDiscipline([{ t: 0, offset: 0 }, { t: 100, offset: 0.5 }])).toBe(100)
    expect(lineDiscipline([{ t: 0, offset: -2 }, { t: 100, offset: 2 }])).toBe(50)
    expect(lineDiscipline([])).toBeNull()
    expect(thresholdSummary({ points: [{ t: 0, level: 3 }, { t: 9, level: 8.5 }], actAt: 8 })).toEqual({ peak: 8.5, crossed: true })
    expect(thresholdSummary({ points: [], actAt: 8 })).toBeNull()
  })
})

describe('weekly summary', () => {
  const now = new Date('2026-11-10T12:00:00Z')
  const day = (n: number): Date => new Date(now.getTime() - n * 86_400_000)
  const calls = [
    { id: 'a', startedAt: day(1), lineMap: map({ open: 'good', questions: 'good', bridge: 'skipped', firstNo: 'blown' }, [{ t: 0, offset: 0 }, { t: 100, offset: 2 }, { t: 200, offset: 2 }], 5) },
    { id: 'b', startedAt: day(2), lineMap: map({ open: 'good', questions: 'shaky', bridge: 'skipped', firstNo: 'notReached' }) },
    { id: 'c', startedAt: day(3), lineMap: null },
    { id: 'old', startedAt: day(9), lineMap: map({ open: 'blown' }) },
  ]
  it('averages stage scores over the calls that reached them and ranks the slips', () => {
    const { current, previous } = splitWeeks(calls, now)
    expect(current).toHaveLength(3)
    expect(previous).toHaveLength(1)
    const w = summarizeWeek(current)
    expect(w.calls).toBe(2)
    expect(w.stages.find((s) => s.key === 'open')).toMatchObject({ reached: 2, good: 2, score: 100 })
    expect(w.stages.find((s) => s.key === 'questions')?.score).toBe(75)
    expect(w.stages.find((s) => s.key === 'firstNo')).toMatchObject({ reached: 1, slipped: 1, score: 0 })
    expect(w.stages.find((s) => s.key === 'close')).toMatchObject({ reached: 0, score: null })
    expect(w.slips[0]).toMatchObject({ key: 'bridge', kind: 'skipped', calls: 2, label: 'Skipped the bridge' })
    expect(w.focus).toBe('bridge')
    expect(w.threshold).toEqual({ avgPeak: 5.5, crossed: 0, of: 2 })
    expect(w.discipline).toBeGreaterThan(0)
  })
  it('handles an empty week', () => {
    const w = summarizeWeek([])
    expect(w).toMatchObject({ calls: 0, discipline: null, threshold: null, slips: [], focus: null })
  })
})
