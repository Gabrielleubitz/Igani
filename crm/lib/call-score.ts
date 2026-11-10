/**
 * The call score, built from parts a salesperson can see and act on (no AI number taken on trust):
 *  - Skills (40%): the Control-of-the-call skills, graded 1–5 against fixed anchors with quoted evidence.
 *  - Tonality (25%): how the rep SOUNDS, judged by a model that listens to the recording, plus the measured pace.
 *  - Conversation (15%): measured from the timestamps: talk share for the call's stage, monologues, questions,
 *    how long the client opened up.
 *  - Result (20%): the next step (specific / vague / none) and how far the sale moved.
 * Parts that can't be judged on a call are left out and the rest re-weighted. Pressure or dishonesty caps the score.
 * Pure (no server code) so the call page can show the same breakdown.
 */
import type { CallMetrics, TranscriptSeg } from './call-coaching'

export const TONALITY_DIMS = [
  { key: 'certainty', label: 'Certainty', hint: 'Sounds sure: statements land down, no hedging or apologetic tone' },
  { key: 'enthusiasm', label: 'Energy', hint: 'Upbeat and alive, especially in the first seconds' },
  { key: 'warmth', label: 'Care', hint: 'Warm and sincere, sounds like they care about the client, not salesy' },
  { key: 'pace', label: 'Pace and pauses', hint: 'Not rushed, pauses after questions, matches the client' },
  { key: 'variety', label: 'Variety', hint: 'Not monotone: rises, drops and emphasis on the words that matter' },
  { key: 'composure', label: 'Composure', hint: 'Calm, reasonable tone under objections and when asking for commitment' },
] as const
export type TonalityKey = (typeof TONALITY_DIMS)[number]['key']

export interface Tonality {
  dims: Partial<Record<TonalityKey, number | null>>
  summary: string
  clientMood: 'warming' | 'steady' | 'cooling' | null
  moments: { at: number | null; note: string; tryThis: string | null }[]
  /** the recording was long: only its first part was listened to */
  coveredSec?: number | null
}

export interface Delivery {
  /** rep words per minute while speaking */
  repWpm: number
  fillersPerMin: number
  fillers: string[]
}

const FILLER_EN = /\b(u+m+|u+h+|e+r+m+|uhm|you know|kind of|sort of|basically|i mean)\b/gi
const FILLER_HE = /(?:^|[\s,.!?])(א+מ+|א+ה+|כאילו|יעני|בקיצור)(?=$|[\s,.!?])/g

/** Pace and filler words from the rep's lines (timestamps, no AI). Speech-to-text drops some fillers, so it's a floor. */
export function deliveryMetrics(lines: TranscriptSeg[]): Delivery | null {
  const rep = lines.filter((l) => l.speaker === 'rep' && l.end > l.start)
  const sec = rep.reduce((s, l) => s + (l.end - l.start), 0)
  if (sec < 20) return null
  const words = rep.reduce((s, l) => s + l.text.split(/\s+/).filter(Boolean).length, 0)
  const found: string[] = []
  for (const l of rep) {
    for (const m of l.text.matchAll(FILLER_EN)) found.push(m[1]!.toLowerCase())
    for (const m of l.text.matchAll(FILLER_HE)) found.push(m[1]!)
  }
  const top = [...found.reduce((m, f) => m.set(f, (m.get(f) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([f]) => f)
  return { repWpm: Math.round(words / (sec / 60)), fillersPerMin: Math.round((found.length / (sec / 60)) * 10) / 10, fillers: top }
}

export type CallStage = 'discovery' | 'presentation' | 'closing' | 'other'

/** The call's stage from its type ("Discovery call", "Proposal follow-up", …): targets differ per stage. */
export function callStage(callType: string): CallStage {
  const t = callType.toLowerCase()
  if (/discover|first|intro|cold|qualif|גילוי|היכרות|ראשונ/.test(t)) return 'discovery'
  if (/demo|present|proposal|walk|הצג|הצעה|דמו/.test(t)) return 'presentation'
  if (/clos|follow|negotiat|sign|סגיר|מעקב/.test(t)) return 'closing'
  return 'other'
}

export const TALK_TARGET: Record<CallStage, { low: number; high: number; max: number }> = {
  discovery: { low: 35, high: 55, max: 65 },
  presentation: { low: 45, high: 70, max: 80 },
  closing: { low: 40, high: 62, max: 72 },
  other: { low: 38, high: 62, max: 72 },
}

/** Comfortable phone pace: Hebrew has fewer, longer words per minute than English. */
export const PACE_TARGET = { en: { low: 125, high: 175 }, he: { low: 95, high: 150 } } as const

const clamp = (n: number, lo = 0, hi = 100): number => Math.max(lo, Math.min(hi, n))
const toPct = (avg1to5: number): number => clamp(Math.round(((avg1to5 - 1) / 4) * 100))
const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

const SKILL_LABEL: Record<string, string> = { rapport: 'rapport', intelligence: 'discovery (gathering intelligence)', control: 'control of the call', threeTens: 'building the three tens', looping: 'handling the no (looping)', closing: 'the close', opening: 'the opening', discovery: 'discovery', listening: 'listening', value: 'value', objections: 'objections' }

export interface ScorePart {
  key: 'skills' | 'tonality' | 'conversation' | 'result'
  label: string
  /** 0–100 */
  score: number
  /** share of the total after re-weighting (0–1) */
  weight: number
  why: string
}

export interface ScoreInput {
  isSalesCall: boolean
  callType: string
  lang?: 'he' | 'en' | 'mixed'
  scores: Record<string, number | undefined>
  straightLine?: { scores: Record<string, number | null>; checks: { id: string; result: 'yes' | 'no' | 'na' }[] }
  metrics?: CallMetrics
  delivery?: Delivery | null
  tonality?: Tonality | null
  nextStep: string | null
  nextStepQuality?: 'specific' | 'vague' | 'none'
  outcome: { score: number }
}

export function paceScore(wpm: number, lang: ScoreInput['lang']): number {
  const t = lang === 'en' ? PACE_TARGET.en : PACE_TARGET.he
  if (wpm >= t.low && wpm <= t.high) return 100
  const off = wpm < t.low ? t.low - wpm : wpm - t.high
  return clamp(Math.round(100 - off * 2), 25)
}

function skillsPart(a: ScoreInput): Omit<ScorePart, 'weight'> | null {
  const sl = a.straightLine ? Object.entries(a.straightLine.scores).filter((e): e is [string, number] => typeof e[1] === 'number') : []
  const entries = sl.length ? sl : Object.entries(a.scores).filter((e): e is [string, number] => typeof e[1] === 'number')
  if (!entries.length) return null
  const sorted = [...entries].sort((x, y) => x[1] - y[1])
  const low = sorted[0]!
  const high = sorted[sorted.length - 1]!
  const why = low[1] === high[1] ? `Even across the skills (${low[1]}/5 each).` : `Strongest: ${SKILL_LABEL[high[0]] ?? high[0]} (${high[1]}/5). Weakest: ${SKILL_LABEL[low[0]] ?? low[0]} (${low[1]}/5).`
  return { key: 'skills', label: 'Sales skills', score: toPct(mean(entries.map((e) => e[1]))!), why }
}

function tonalityPart(a: ScoreInput): (Omit<ScorePart, 'weight'> & { full: boolean }) | null {
  const dims = a.tonality ? TONALITY_DIMS.map((d) => [d, a.tonality!.dims[d.key]] as const).filter((x): x is readonly [(typeof TONALITY_DIMS)[number], number] => typeof x[1] === 'number') : []
  const pace = a.delivery ? paceScore(a.delivery.repWpm, a.lang) : null
  if (dims.length) {
    const voice = toPct(mean(dims.map((d) => d[1]))!)
    const sorted = [...dims].sort((x, y) => x[1] - y[1])
    const low = sorted[0]!
    const high = sorted[sorted.length - 1]!
    const score = pace == null ? voice : Math.round(voice * 0.8 + pace * 0.2)
    const why = low[1] === high[1] ? `Heard on the recording: ${low[1]}/5 across the board.` : `Heard on the recording: best on ${high[0].label.toLowerCase()} (${high[1]}/5), weakest on ${low[0].label.toLowerCase()} (${low[1]}/5).`
    return { key: 'tonality', label: 'Tonality', score, why, full: true }
  }
  if (pace == null) return null
  return { key: 'tonality', label: 'Tonality', score: pace, why: `Pace only (${a.delivery!.repWpm} words a minute): the voice itself wasn't judged on this call.`, full: false }
}

function conversationPart(a: ScoreInput): Omit<ScorePart, 'weight'> | null {
  const m = a.metrics
  if (!m) return null
  const stage = callStage(a.callType)
  const t = TALK_TARGET[stage]
  const r = m.talkRatioRep
  const talk = r >= t.low && r <= t.high ? 100 : r < t.low ? clamp(100 - (t.low - r) * 2.5, 45) : r <= t.max ? Math.round(100 - ((r - t.high) / (t.max - t.high)) * 45) : clamp(55 - (r - t.max) * 3, 10)
  const mono = m.longestMonologueSec <= 90 ? 100 : m.longestMonologueSec <= 120 ? 85 : m.longestMonologueSec <= 180 ? 60 : 30
  const client = m.longestClientStretchSec >= 45 ? 100 : m.longestClientStretchSec >= 25 ? 80 : m.longestClientStretchSec >= 10 ? 60 : 40
  const q = m.repQuestions
  const questions = stage !== 'discovery' ? null : q >= 11 && q <= 16 ? 100 : q > 16 ? (q > 22 ? 65 : 85) : q >= 8 ? 80 : q >= 5 ? 60 : 35
  const parts: [number, string][] = [
    [talk, r > t.high ? `you talked ${r}% (aim for ${t.low}–${t.high}% on this kind of call)` : r < t.low ? `you talked only ${r}%: lead more` : `talk share ${r}% is right for the stage`],
    [mono, `longest monologue ${Math.floor(m.longestMonologueSec / 60)}:${String(m.longestMonologueSec % 60).padStart(2, '0')}`],
    [client, `the client's longest stretch was ${m.longestClientStretchSec}s`],
    ...(questions == null ? [] : ([[questions, q > 16 ? `${q} questions: it can feel like an interrogation` : `${q} questions (11–14 is the sweet spot on discovery)`]] as [number, string][])),
  ]
  const worst = [...parts].sort((x, y) => x[0] - y[0])[0]!
  const score = Math.round(mean(parts.map((p) => p[0]))!)
  return { key: 'conversation', label: 'Conversation', score, why: worst[0] >= 90 ? 'Balanced: you listened, kept turns short and the client opened up.' : `Biggest gap: ${worst[1]}.` }
}

function resultPart(a: ScoreInput): Omit<ScorePart, 'weight'> {
  const q = a.nextStepQuality ?? (a.nextStep ? 'vague' : 'none')
  const next = q === 'specific' ? 100 : q === 'vague' ? 50 : 15
  const score = Math.round(next * 0.6 + clamp(a.outcome.score) * 0.4)
  const why = q === 'specific' ? 'A specific, dated next step was agreed.' : q === 'vague' ? 'A next step came up but it has no date or owner: book the time before you hang up.' : 'No next step was agreed.'
  return { key: 'result', label: 'Result', score, why }
}

const WEIGHT = { skills: 40, tonality: 25, conversation: 15, result: 20 } as const

export interface CallScore {
  total: number
  parts: ScorePart[]
  /** why the score was capped (pressure / dishonesty), if it was */
  capped: string | null
  /** the part that would lift the score most if improved */
  lift: ScorePart | null
}

export function buildScore(a: ScoreInput): CallScore {
  const tone = tonalityPart(a)
  const raw: [Omit<ScorePart, 'weight'>, number][] = []
  const s = skillsPart(a)
  if (s) raw.push([s, WEIGHT.skills])
  if (tone) raw.push([tone, tone.full ? WEIGHT.tonality : 8]) // pace alone counts for less
  const c = conversationPart(a)
  if (c) raw.push([c, WEIGHT.conversation])
  raw.push([resultPart(a), WEIGHT.result])
  const sum = raw.reduce((t, [, w]) => t + w, 0)
  const parts: ScorePart[] = raw.map(([p, w]) => ({ key: p.key, label: p.label, score: p.score, why: p.why, weight: w / sum }))
  let total = Math.round(parts.reduce((t, p) => t + p.score * p.weight, 0))
  let capped: string | null = null
  if (a.straightLine?.checks.some((k) => k.id === 'honest-no-pressure' && k.result === 'no')) {
    if (total > 55) total = 55
    capped = 'Capped at 55: the call crossed into pressure or wasn’t fully honest. A sale won that way costs more than it brings.'
  }
  const lift = [...parts].sort((x, y) => (100 - y.score) * y.weight - (100 - x.score) * x.weight)[0] ?? null
  return { total: clamp(total), parts, capped, lift: lift && lift.score < 90 ? lift : null }
}
