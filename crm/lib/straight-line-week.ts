import { LINE_STAGES, STAGE_LABEL, lineDiscipline, thresholdSummary, type LineMap, type LineStageKey } from './line-map'

export interface WeekCall {
  id: string
  startedAt: Date
  lineMap: LineMap | null
}

export interface StageWeek {
  key: LineStageKey
  /** calls that got to this stage */
  reached: number
  good: number
  shaky: number
  slipped: number
  skipped: number
  /** 0 to 100: good counts 1, shaky 0.5, slipped and skipped 0; null when never reached */
  score: number | null
}

export interface Slip {
  key: LineStageKey
  kind: 'slipped' | 'skipped'
  label: string
  calls: number
  examples: { callId: string; at: number | null; note: string | null }[]
}

export interface WeekSummary {
  calls: number
  stages: StageWeek[]
  /** average share of the call spent between the boundaries, 0 to 100 */
  discipline: number | null
  threshold: { avgPeak: number; crossed: number; of: number } | null
  slips: Slip[]
  /** the weakest stage (needs at least 2 calls that reached it) */
  focus: LineStageKey | null
}

/** One rep's week on control of the call, from the calls that were analysed with a line map. Pure. */
export function summarizeWeek(calls: WeekCall[]): WeekSummary {
  const withMap = calls.filter((c): c is WeekCall & { lineMap: LineMap } => c.lineMap !== null)
  const stages: StageWeek[] = LINE_STAGES.map((key) => {
    const rows = withMap.map((c) => ({ c, s: c.lineMap.stages.find((x) => x.key === key) })).filter((r) => r.s && r.s.status !== 'notReached')
    const count = (st: string): number => rows.filter((r) => r.s!.status === st).length
    const good = count('good')
    const shaky = count('shaky')
    const slipped = count('blown')
    const skipped = count('skipped')
    return { key, reached: rows.length, good, shaky, slipped, skipped, score: rows.length ? Math.round(((good + shaky * 0.5) / rows.length) * 100) : null }
  })

  const slipMap = new Map<string, Slip>()
  for (const c of withMap) {
    for (const s of c.lineMap.stages) {
      if (s.status !== 'blown' && s.status !== 'skipped') continue
      const kind = s.status === 'blown' ? 'slipped' : 'skipped'
      const id = `${s.key}:${kind}`
      const cur = slipMap.get(id) ?? { key: s.key, kind, label: kind === 'skipped' ? `Skipped the ${STAGE_LABEL[s.key].toLowerCase()}` : `Slipped on the ${STAGE_LABEL[s.key].toLowerCase()}`, calls: 0, examples: [] }
      cur.calls += 1
      if (cur.examples.length < 2) cur.examples.push({ callId: c.id, at: s.at, note: s.note })
      slipMap.set(id, cur)
    }
  }
  const slips = [...slipMap.values()].sort((a, b) => b.calls - a.calls).slice(0, 4)

  const discs = withMap.map((c) => lineDiscipline(c.lineMap.path)).filter((v): v is number => v !== null)
  const thr = withMap.map((c) => thresholdSummary(c.lineMap.threshold)).filter((v): v is { peak: number; crossed: boolean } => v !== null)
  const focus = stages.filter((s) => s.reached >= 2 && s.score !== null).sort((a, b) => (a.score as number) - (b.score as number))[0]?.key ?? null

  return {
    calls: withMap.length,
    stages,
    discipline: discs.length ? Math.round(discs.reduce((a, b) => a + b, 0) / discs.length) : null,
    threshold: thr.length ? { avgPeak: +(thr.reduce((a, b) => a + b.peak, 0) / thr.length).toFixed(1), crossed: thr.filter((t) => t.crossed).length, of: thr.length } : null,
    slips,
    focus,
  }
}

/** Splits calls into this week (the last 7 days) and the week before, for the trend. */
export function splitWeeks<T extends { startedAt: Date }>(calls: T[], now = new Date()): { current: T[]; previous: T[] } {
  const week = 7 * 86_400_000
  return {
    current: calls.filter((c) => now.getTime() - c.startedAt.getTime() < week),
    previous: calls.filter((c) => now.getTime() - c.startedAt.getTime() >= week && now.getTime() - c.startedAt.getTime() < 2 * week),
  }
}
