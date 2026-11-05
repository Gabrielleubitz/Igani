import type { LineMap } from './line-map'

/** Realistic sample line maps for the dev preview page (never used in production code paths). */
export const SAMPLE_STRONG: { map: LineMap; durationSec: number } = {
  durationSec: 552,
  map: {
    stages: [
      { key: 'open', status: 'good', at: 4, note: 'Energetic opening with a clear reason for the call' },
      { key: 'questions', status: 'good', at: 40, note: 'Big-picture questions first, then listings and lead sources' },
      { key: 'bridge', status: 'good', at: 300, note: 'Clean "based on what you told me, this is a perfect fit"' },
      { key: 'presentation', status: 'good', at: 330, note: 'Short and tied to their headache' },
      { key: 'firstNo', status: 'shaky', at: 420, note: '"Let me think about it": calm, but did not ask what exactly' },
      { key: 'loop', status: 'good', at: 450, note: 'Looped on the idea, then the company' },
      { key: 'close', status: 'good', at: 520, note: 'Booked a 15-minute walkthrough Thursday 11:00' },
    ],
    path: [
      { t: 0, offset: 0 }, { t: 40, offset: 0.3 }, { t: 110, offset: -0.4 }, { t: 180, offset: 0.2 }, { t: 215, offset: 1.3 }, { t: 245, offset: 0.4 }, { t: 300, offset: 0 }, { t: 340, offset: 0.1 },
      { t: 400, offset: -0.2 }, { t: 425, offset: 0.9 }, { t: 470, offset: 0.1 }, { t: 520, offset: 0 }, { t: 552, offset: 0 },
    ],
    threshold: { actAt: 8, points: [{ t: 0, level: 1 }, { t: 40, level: 2.5 }, { t: 120, level: 4 }, { t: 210, level: 5 }, { t: 300, level: 6.5 }, { t: 340, level: 7.5 }, { t: 420, level: 5.5 }, { t: 460, level: 7 }, { t: 500, level: 8.5 }, { t: 552, level: 9 }] },
  },
}

export const SAMPLE_LOST: { map: LineMap; durationSec: number } = {
  durationSec: 450,
  map: {
    stages: [
      { key: 'open', status: 'good', at: 5, note: 'Strong start' },
      { key: 'questions', status: 'shaky', at: 50, note: 'Drifted into talking about their holiday for two minutes' },
      { key: 'bridge', status: 'skipped', at: null, note: 'Went straight to the pitch with no "perfect fit" bridge' },
      { key: 'presentation', status: 'blown', at: 220, note: 'Unloaded every feature and the price in one go' },
      { key: 'firstNo', status: 'blown', at: 300, note: 'Argued the price instead of asking "think about what exactly?"' },
      { key: 'loop', status: 'notReached', at: null, note: null },
      { key: 'close', status: 'notReached', at: null, note: null },
    ],
    path: [
      { t: 0, offset: 0 }, { t: 50, offset: 0.4 }, { t: 100, offset: 1.4 }, { t: 160, offset: 2.1 }, { t: 205, offset: 1.1 }, { t: 240, offset: 1.6 }, { t: 300, offset: 2.3 }, { t: 350, offset: 1.9 }, { t: 400, offset: 1.5 }, { t: 450, offset: 1.8 },
    ],
    threshold: { actAt: 8, points: [{ t: 0, level: 1.5 }, { t: 50, level: 3 }, { t: 100, level: 3.5 }, { t: 160, level: 2.8 }, { t: 220, level: 4.5 }, { t: 260, level: 5.5 }, { t: 300, level: 3.5 }, { t: 350, level: 2.5 }, { t: 450, level: 1.5 }] },
  },
}

export const SAMPLE_SHORT: { map: LineMap; durationSec: number } = {
  durationSec: 70,
  map: {
    stages: [
      { key: 'open', status: 'shaky', at: 3, note: 'Hesitant opening: "is this a bad time?"' },
      { key: 'questions', status: 'notReached', at: null, note: null },
      { key: 'bridge', status: 'notReached', at: null, note: null },
      { key: 'presentation', status: 'notReached', at: null, note: null },
      { key: 'firstNo', status: 'blown', at: 40, note: 'Accepted "not interested" without a single question' },
      { key: 'loop', status: 'notReached', at: null, note: null },
      { key: 'close', status: 'notReached', at: null, note: null },
    ],
    path: [{ t: 0, offset: 0 }, { t: 20, offset: 0.8 }, { t: 40, offset: 1.6 }, { t: 70, offset: 1.9 }],
    threshold: { actAt: 8, points: [{ t: 0, level: 1 }, { t: 25, level: 1.5 }, { t: 45, level: 0.8 }, { t: 70, level: 0.5 }] },
  },
}

/** A week of calls for the Today and admin cards. */
export function sampleWeekCalls(now = new Date()): { id: string; startedAt: Date; lineMap: LineMap | null }[] {
  const d = (n: number): Date => new Date(now.getTime() - n * 86_400_000 + 3_600_000)
  const NOTE = { good: 'Done well', shaky: 'Done, but rushed and weak', blown: 'Argued instead of asking "think about what exactly?"', skipped: 'Went straight to the pitch with no "perfect fit" bridge', notReached: null } as const
  const variant = (base: LineMap, patch: Record<string, 'good' | 'shaky' | 'blown' | 'skipped' | 'notReached'>): LineMap => ({ ...base, stages: base.stages.map((s) => (patch[s.key] ? { ...s, status: patch[s.key]!, note: NOTE[patch[s.key]!] } : s)) })
  return [
    { id: 'c1', startedAt: d(0), lineMap: SAMPLE_STRONG.map },
    { id: 'c2', startedAt: d(1), lineMap: SAMPLE_LOST.map },
    { id: 'c3', startedAt: d(1), lineMap: variant(SAMPLE_STRONG.map, { bridge: 'skipped', firstNo: 'blown', close: 'shaky' }) },
    { id: 'c4', startedAt: d(2), lineMap: SAMPLE_SHORT.map },
    { id: 'c5', startedAt: d(3), lineMap: variant(SAMPLE_LOST.map, { questions: 'good', presentation: 'shaky' }) },
    { id: 'c6', startedAt: d(4), lineMap: variant(SAMPLE_STRONG.map, { bridge: 'skipped', loop: 'shaky' }) },
    { id: 'c7', startedAt: d(5), lineMap: variant(SAMPLE_LOST.map, { open: 'shaky' }) },
    { id: 'c8', startedAt: d(6), lineMap: SAMPLE_STRONG.map },
  ]
}
