/** The call drawn on the Straight Line: stages, the path around the line, and the action-threshold curve. Pure (no server imports). */

export const LINE_STAGES = ['open', 'questions', 'bridge', 'presentation', 'firstNo', 'loop', 'close'] as const
export type LineStageKey = (typeof LINE_STAGES)[number]
export const STAGE_STATUSES = ['good', 'shaky', 'blown', 'skipped', 'notReached'] as const
export type StageStatus = (typeof STAGE_STATUSES)[number]

export const STAGE_LABEL: Record<LineStageKey, string> = {
  open: 'Open',
  questions: 'Questions',
  bridge: 'Bridge',
  presentation: 'Presentation',
  firstNo: 'First no',
  loop: 'Loops',
  close: 'Close',
}

/** What each stage asks of the rep (shown in tooltips and the weekly view). */
export const STAGE_HINT: Record<LineStageKey, string> = {
  open: 'Sharp, enthusiastic, authority, a clear reason in the first seconds',
  questions: 'Big picture first, then specifics. Listen. Powder dry',
  bridge: '"Based on everything you told me, this is a perfect fit"',
  presentation: 'Short, tied to their words, future pace, soft close',
  firstNo: 'Stay calm, no surprise, no arguing',
  loop: 'A new angle each time: the idea, you, the company',
  close: 'Calm, specific, dated next step',
}

export interface LineStage {
  key: LineStageKey
  status: StageStatus
  /** second of the call where it happened (null when unknown or not reached) */
  at: number | null
  note: string | null
}
export interface PathPoint {
  t: number
  /** 0 = on the line, beyond +-1 = outside the boundaries (control lost) */
  offset: number
}
export interface ThresholdPoint {
  t: number
  /** 0 to 10: how ready the prospect is to buy */
  level: number
}
export interface LineMap {
  stages: LineStage[]
  path: PathPoint[]
  threshold: { points: ThresholdPoint[]; actAt: number }
}

const clamp = (n: number, a: number, b: number): number => Math.max(a, Math.min(b, n))

/** Tidies a model-produced line map: known stages in line order (one each), points sorted, values clamped. Returns null if there is nothing to draw. */
export function normalizeLineMap(raw: { stages: { key: string; status: string; at: number | null; note: string | null }[]; path: { t: number; offset: number }[]; threshold: { points: { t: number; level: number }[]; actAt: number } }): LineMap | null {
  const seen = new Set<string>()
  const stages: LineStage[] = []
  for (const s of raw.stages) {
    if (!(LINE_STAGES as readonly string[]).includes(s.key) || seen.has(s.key) || !(STAGE_STATUSES as readonly string[]).includes(s.status)) continue
    seen.add(s.key)
    stages.push({ key: s.key as LineStageKey, status: s.status as StageStatus, at: s.at == null || !Number.isFinite(s.at) ? null : Math.max(0, Math.round(s.at)), note: s.note ? s.note.trim().slice(0, 200) || null : null })
  }
  stages.sort((a, b) => LINE_STAGES.indexOf(a.key) - LINE_STAGES.indexOf(b.key))
  const byTime = <T extends { t: number }>(a: T[]): T[] => a.filter((p) => Number.isFinite(p.t)).sort((x, y) => x.t - y.t)
  const path = byTime(raw.path).map((p) => ({ t: Math.max(0, Math.round(p.t)), offset: +clamp(p.offset, -2.5, 2.5).toFixed(2) }))
  const points = byTime(raw.threshold.points).map((p) => ({ t: Math.max(0, Math.round(p.t)), level: +clamp(p.level, 0, 10).toFixed(1) }))
  if (!stages.length && !path.length && !points.length) return null
  return { stages, path: path.slice(0, 40), threshold: { points: points.slice(0, 40), actAt: +clamp(raw.threshold.actAt, 4, 10).toFixed(1) } }
}

/** The stretches of the call (seconds) where the path is outside the boundaries (|offset| > 1), exact for straight segments between points. */
export function offLineStretches(path: PathPoint[]): [number, number][] {
  const out: [number, number][] = []
  const push = (a: number, b: number): void => {
    if (b - a < 0.01) return
    const last = out[out.length - 1]
    if (last && Math.abs(last[1] - a) < 0.01) last[1] = b
    else out.push([a, b])
  }
  for (let i = 1; i < path.length; i++) {
    const p = path[i - 1]!
    const q = path[i]!
    const dt = q.t - p.t
    if (dt <= 0) continue
    const d = q.offset - p.offset
    let lo = 0
    let hi = 1
    if (Math.abs(d) < 1e-9) {
      if (Math.abs(p.offset) <= 1) [lo, hi] = [0, 1]
      else [lo, hi] = [0, 0]
    } else {
      const t1 = (-1 - p.offset) / d
      const t2 = (1 - p.offset) / d
      lo = Math.max(0, Math.min(t1, t2))
      hi = Math.min(1, Math.max(t1, t2))
      if (hi < lo) [lo, hi] = [0, 0]
    }
    if (hi <= lo) push(p.t, q.t)
    else {
      push(p.t, p.t + lo * dt)
      push(p.t + hi * dt, q.t)
    }
  }
  return out
}

/** Share of the call spent between the two boundaries (0 to 100); null when there is no path. */
export function lineDiscipline(path: PathPoint[]): number | null {
  if (path.length === 0) return null
  if (path.length === 1) return Math.abs(path[0]!.offset) <= 1 ? 100 : 0
  const total = path[path.length - 1]!.t - path[0]!.t
  if (total <= 0) return null
  const outside = offLineStretches(path).reduce((n, [a, b]) => n + (b - a), 0)
  return Math.round((1 - outside / total) * 100)
}

/** Highest readiness reached, and whether the curve crossed the action threshold. */
export function thresholdSummary(t: LineMap['threshold']): { peak: number; crossed: boolean } | null {
  if (!t.points.length) return null
  const peak = Math.max(...t.points.map((p) => p.level))
  return { peak, crossed: peak >= t.actAt }
}

/** The lesson that teaches each stage (episode and second), for "Focus this week" links. */
export const STAGE_LESSON: Record<LineStageKey, { ep: number; startSec: number }> = {
  open: { ep: 3, startSec: 693 },
  questions: { ep: 7, startSec: 442 },
  bridge: { ep: 7, startSec: 1387 },
  presentation: { ep: 8, startSec: 1949 },
  firstNo: { ep: 6, startSec: 1941 },
  loop: { ep: 8, startSec: 2786 },
  close: { ep: 9, startSec: 1865 },
}
