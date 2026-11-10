'use client'

import { useCallPlayer } from '@/components/calls/CallView'
import { LINE_STAGES, STAGE_HINT, STAGE_LABEL, lineDiscipline, offLineStretches, thresholdSummary, type LineMap, type LineStage, type StageStatus } from '@/lib/line-map'

const W = 1000
const PAD_L = 46
const PAD_R = 24
const PW = W - PAD_L - PAD_R
const COLOR: Record<StageStatus, string> = { good: '#34d399', shaky: '#fbbf24', blown: '#f87171', skipped: '#94a3b8', notReached: '#475569' }
const STATUS_TEXT: Record<StageStatus, string> = { good: 'On the line', shaky: 'Shaky', blown: 'Slipped', skipped: 'Skipped', notReached: 'Not reached' }
const mmss = (sec: number): string => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`

/** Smooth curve through points (quadratic through midpoints). */
function smooth(pts: [number, number][]): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M${pts[0]![0]},${pts[0]![1]}`
  let d = `M${pts[0]![0]},${pts[0]![1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i]!
    const [nx, ny] = pts[i + 1]!
    d += ` Q${x},${y} ${(x + nx) / 2},${(y + ny) / 2}`
  }
  const last = pts[pts.length - 1]!
  return `${d} T${last[0]},${last[1]}`
}

/** Places every stage on the time axis: at its own second, else between its neighbours; stages the call never reached sit at the end. */
function stageTimes(stages: LineStage[], duration: number): Map<string, number> {
  const known = stages.map((s) => (s.status === 'notReached' ? null : s.at))
  const out = new Map<string, number>()
  stages.forEach((s, i) => {
    if (s.status === 'notReached') return void out.set(s.key, duration)
    if (known[i] != null) return void out.set(s.key, known[i]!)
    const prev = [...known.slice(0, i)].reverse().find((v) => v != null) ?? 0
    const nextIdx = known.findIndex((v, j) => j > i && v != null)
    const next = nextIdx >= 0 ? known[nextIdx]! : duration
    out.set(s.key, (prev + next) / 2)
  })
  return out
}

/**
 * The call drawn on control of the call: the line with its dotted boundaries and the path of the call around it (red where it left
 * the boundaries), the stage markers, and below it the prospect's readiness against the action threshold. Click a marker or the
 * chart to play that moment. Everything is the coach's reading of the transcript.
 */
export function StraightLineChart({ map, durationSec, compact = false }: { map: LineMap; durationSec: number; compact?: boolean }): React.ReactElement {
  const player = useCallPlayer()
  const last = Math.max(map.path.at(-1)?.t ?? 0, map.threshold.points.at(-1)?.t ?? 0, ...map.stages.map((s) => s.at ?? 0))
  const dur = Math.max(durationSec || 0, last, 30)
  const x = (t: number): number => PAD_L + (Math.min(t, dur) / dur) * PW
  const H1 = compact ? 110 : 200
  const mid = H1 / 2
  const unit = compact ? 24 : 46
  const y1 = (off: number): number => Math.max(6, Math.min(H1 - 6, mid - off * unit))
  const labelsY = H1 + 40
  const TOP2 = compact ? 0 : labelsY + 56
  const H2 = compact ? 0 : 150
  const y2 = (lvl: number): number => TOP2 + H2 - (lvl / 10) * (H2 - 14) - 4
  const total = compact ? H1 + 4 : TOP2 + H2 + 34
  const times = stageTimes(map.stages, dur)
  const stages = LINE_STAGES.map((k) => map.stages.find((s) => s.key === k)).filter((s): s is LineStage => Boolean(s))
  const colW = PW / Math.max(1, stages.length)
  const pathPts: [number, number][] = map.path.map((p) => [x(p.t), y1(p.offset)])
  const thr = map.threshold
  const thrPts: [number, number][] = thr.points.map((p) => [x(p.t), y2(p.level)])
  const summary = thresholdSummary(thr)
  const disc = lineDiscipline(map.path)
  const ticks = Array.from({ length: Math.floor(dur / 60) + 1 }, (_, i) => i * 60).filter((t) => t <= dur)
  const tickStep = ticks.length > 12 ? 2 : 1
  const cross = summary?.crossed ? thr.points.find((p) => p.level >= thr.actAt) : null
  const seekAt = (e: React.MouseEvent<SVGSVGElement>): void => {
    if (!player) return
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    if (px < PAD_L || px > W - PAD_R) return
    player.seek(((px - PAD_L) / PW) * dur)
  }

  return (
    <div className="w-full">
      {!compact ? (
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
          <span>The call on the line · the coach’s read of the transcript</span>
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            {disc != null ? <span>On the line <b className="text-foreground">{disc}%</b> of the call</span> : null}
            {summary ? (
              <span>
                Readiness peaked at <b className="text-foreground">{summary.peak}/10</b> {summary.crossed ? <span className="text-emerald-400">· reached the action threshold</span> : <span className="text-amber-300">· never reached the action threshold</span>}
              </span>
            ) : null}
          </span>
        </div>
      ) : null}
      <div className={compact ? '' : 'overflow-x-auto'}>
      <svg viewBox={`0 0 ${W} ${total}`} role="img" aria-label="The call drawn on control of the call with its boundaries and the action threshold" className={compact ? 'block w-full' : 'block w-full min-w-[760px]'} onClick={seekAt} style={{ cursor: player ? 'pointer' : 'default' }}>
        <defs>
          <linearGradient id="slc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4080e0" stopOpacity=".45" />
            <stop offset="100%" stopColor="#4080e0" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* off-the-line stretches */}
        {offLineStretches(map.path).map(([a, b], i) => (
          <g key={i}>
            <rect x={x(a)} y={4} width={Math.max(6, x(b) - x(a))} height={H1 - 8} fill="#f87171" opacity=".14" rx="6" />
            {!compact ? <text x={x(a) + 6} y={16} fontSize="11" fill="#fca5a5">off the line {mmss(a)} to {mmss(b)}</text> : null}
          </g>
        ))}

        {/* boundaries and the line */}
        <line x1={PAD_L} x2={W - PAD_R} y1={y1(1)} y2={y1(1)} stroke="#64748b" strokeDasharray="6 6" strokeWidth="1.2" />
        <line x1={PAD_L} x2={W - PAD_R} y1={y1(-1)} y2={y1(-1)} stroke="#64748b" strokeDasharray="6 6" strokeWidth="1.2" />
        <line x1={PAD_L} x2={W - PAD_R} y1={mid} y2={mid} stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" opacity=".7" />
        {!compact ? (
          <>
            <text x={6} y={y1(1) + 4} fontSize="10" fill="#94a3b8">upper</text>
            <text x={6} y={y1(-1) + 4} fontSize="10" fill="#94a3b8">lower</text>
            <text x={6} y={mid + 4} fontSize="10" fill="#cbd5e1">line</text>
          </>
        ) : null}

        {/* the call's path */}
        {pathPts.length > 1 ? <path d={smooth(pathPts)} fill="none" stroke="#4080e0" strokeWidth={compact ? 2.5 : 3.5} strokeLinecap="round" strokeLinejoin="round" /> : null}

        {/* stage markers */}
        {stages.map((s, i) => {
          const sx = x(times.get(s.key) ?? 0)
          const cx = PAD_L + colW * i + colW / 2
          const c = COLOR[s.status]
          const hollow = s.status === 'skipped' || s.status === 'notReached'
          return (
            <g key={s.key} onClick={(e) => { if (s.at != null && player) { e.stopPropagation(); player.seek(s.at) } }} style={{ cursor: s.at != null && player ? 'pointer' : 'default' }}>
              <title>{`${STAGE_LABEL[s.key]}: ${STATUS_TEXT[s.status]}${s.at != null ? ` at ${mmss(s.at)}` : ''}${s.note ? `. ${s.note}` : ''}. ${STAGE_HINT[s.key]}`}</title>
              {s.status !== 'notReached' ? <circle cx={sx} cy={mid} r={compact ? 6 : 10} fill={hollow ? '#0b1b33' : c} stroke={c} strokeWidth="3" /> : null}
              {!compact ? (
                <>
                  {s.status !== 'notReached' ? <line x1={sx} y1={mid + 12} x2={cx} y2={labelsY - 22} stroke={c} strokeWidth="1" opacity=".35" /> : null}
                  <rect x={cx - colW / 2 + 5} y={labelsY - 20} width={colW - 10} height={46} rx="8" fill={c} opacity={s.status === 'notReached' ? 0.07 : 0.14} stroke={c} strokeOpacity=".5" />
                  <text x={cx} y={labelsY - 2} textAnchor="middle" fontSize="13" fontWeight="600" fill="#e2e8f0">{STAGE_LABEL[s.key]}</text>
                  <text x={cx} y={labelsY + 15} textAnchor="middle" fontSize="11" fill={c}>
                    {STATUS_TEXT[s.status]}
                    {s.at != null && s.status !== 'notReached' ? ` · ${mmss(s.at)}` : ''}
                  </text>
                </>
              ) : null}
            </g>
          )
        })}

        {/* action threshold track */}
        {!compact ? (
          <g>
            <text x={PAD_L} y={TOP2 - 8} fontSize="12" fill="#94a3b8">Action threshold · how ready the prospect is to buy (0 to 10)</text>
            {[0, 5, 10].map((v) => (
              <g key={v}>
                <line x1={PAD_L} x2={W - PAD_R} y1={y2(v)} y2={y2(v)} stroke="#334155" strokeWidth="1" opacity=".6" />
                <text x={PAD_L - 6} y={y2(v) + 4} textAnchor="end" fontSize="10" fill="#64748b">{v}</text>
              </g>
            ))}
            <line x1={PAD_L} x2={W - PAD_R} y1={y2(thr.actAt)} y2={y2(thr.actAt)} stroke="#fbbf24" strokeDasharray="7 5" strokeWidth="1.8" />
            <text x={PAD_L + 6} y={y2(thr.actAt) - 6} fontSize="11" fill="#fbbf24">action threshold</text>
            {thrPts.length > 1 ? (
              <>
                <path d={`${smooth(thrPts)} L${thrPts.at(-1)![0]},${y2(0)} L${thrPts[0]![0]},${y2(0)} Z`} fill="url(#slc-fill)" />
                <path d={smooth(thrPts)} fill="none" stroke="#7aa7f0" strokeWidth="3" strokeLinecap="round" />
              </>
            ) : null}
            {cross ? (
              <g>
                <circle cx={x(cross.t)} cy={y2(cross.level)} r="7" fill="#34d399" />
                <text x={x(cross.t)} y={y2(cross.level) - 12} textAnchor="middle" fontSize="11" fontWeight="700" fill="#34d399">acted</text>
              </g>
            ) : null}
          </g>
        ) : null}

        {/* time axis */}
        {!compact
          ? ticks
              .filter((_, i) => i % tickStep === 0)
              .map((t) => (
                <text key={t} x={x(t)} y={total - 8} textAnchor="middle" fontSize="10" fill="#64748b">
                  {mmss(t)}
                </text>
              ))
          : null}

        {/* playhead */}
        {player && player.time > 0 ? <line x1={x(player.time)} x2={x(player.time)} y1={2} y2={total - 22} stroke="#fff" strokeWidth="1.5" opacity=".7" /> : null}
      </svg>
      </div>
    </div>
  )
}
