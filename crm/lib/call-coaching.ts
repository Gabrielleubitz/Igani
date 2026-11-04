/**
 * The sales-coaching knowledge behind call analysis, and the call metrics we measure ourselves instead of asking the
 * model to guess. Sources (Nov 2026 research):
 *  - Gong, 519k discovery calls: top performers talk ~43–46%, ask 11–14 targeted questions spread across the call
 *    (not front-loaded), go deep on 3–4 problems; 2025 refresh (326k calls): won deals ~57% rep talk vs 62% lost,
 *    >65% rep talk lowers win rates, shorter seller monologues on won deals.
 *  - MEDDPICC (qualification), SPIN (question types), Challenger (teach / tailor / take control),
 *    LAER objection handling (Listen, Acknowledge, Explore, Respond; then confirm it's resolved).
 *  - Published call-review Claude skills: 1–5 rubric with evidence, best moment first, missed opportunity with a
 *    better line, 1–2 focus areas with a drill, red flags (vague next step, avoiding budget/authority).
 */

/** Benchmarks shown next to each metric (guides, not hard rules). */
export const BENCHMARKS = {
  talkRatio: { discoveryLow: 40, discoveryHigh: 55, max: 65 },
  questions: { low: 11, high: 14 },
  monologueSec: 120,
} as const

/** The coaching playbook the model is trained on (part of its instructions). */
export const PLAYBOOK = `COACHING PLAYBOOK (research-based; apply with judgement, the call's stage matters)

Context: Igani is a small web studio (websites, booking systems, e-commerce, dashboards, automations, AI agents).
Clients are mostly small and mid-size businesses in Israel and the US; calls are usually discovery calls, proposal
follow-ups or closing calls, often in Hebrew. Israeli business talk is direct: don't penalise directness, penalise
not listening.

What great looks like (data from 500k+ recorded B2B calls):
- Talk less on discovery: top performers talk ~43–46% of the time; over ~65% hurts win rates. Demos and proposal
  walk-throughs can run 60–70%.
- Ask 11–14 targeted questions on a discovery call, spread through the call (not a checklist at the start). Questions
  about the client's business, goals, problems and consequences matter far more than feature questions.
- Go deep on 3–4 problems rather than touching ten. Understand their business and plans before the pain.
- Keep monologues short (under ~2 minutes); check in, let the client react.
- Close every call with a specific, dated next step both sides agreed to. "I'll send something and we'll talk" is
  a red flag.

Rubric (score each 1–5, 3 = acceptable, 5 = could be used to train others):
- opening: rapport, a clear reason for the call, an agenda or "upfront contract" (what we'll cover, how long, what
  happens at the end).
- discovery: SPIN depth: situation → problem → implication ("what does that cost you?") → need-payoff ("if that
  were solved, what would it mean?"). Uncovered real pain with impact and urgency, not surface facts.
- listening: paraphrased, asked follow-ups on what the client said, didn't interrupt, built on their words.
- value: tied what Igani builds to THIS client's situation, in their terms; taught them something useful
  (Challenger), no generic feature dump.
- objections: LAER: listened fully, acknowledged, explored what's behind it with a question, responded with
  substance, then checked it was resolved. Price objections answered with value/ROI in the client's numbers. If no
  objection came up, score 3 unless the rep surfaced and handled a hidden concern well (then 4–5).
- closing: secured a specific, time-bound next step (date/time, who, what) with the client's agreement.

Qualification (MEDDPICC adapted for a web studio): pain, impact (what the problem costs them, in numbers if
possible), decision maker (who decides / signs), decision process (who else, how they decide), budget, timeline,
alternatives (other studios, DIY tools like Wix, doing nothing). Only expect what's reasonable for the stage: a first
call needn't cover the decision process in full, but pain, impact and timeline should come up.

Signals:
- buying signals: asks about price, timeline, process, examples, "how would it work for us", brings in a colleague.
- risk signals: vague or no next step, budget or decision maker avoided, competitor raised unprompted, client mostly
  silent or short answers, "send me something" brush-off, rep talked over the client.

Coaching style: start with what worked. Pick the 1–2 changes that would most improve the next call (not ten).
For each: the skill, why it matters for winning, a short drill, and the exact words to try next time, in the call's
language. Be specific to this call, quote it, never generic advice.`

export interface TranscriptSeg {
  start: number
  end: number
  text: string
  speaker: 'rep' | 'client'
}

export interface CallMetrics {
  /** % of speaking time by the rep (from timestamps) */
  talkRatioRep: number
  repSeconds: number
  clientSeconds: number
  /** longest unbroken stretch of the rep talking */
  longestMonologueSec: number
  longestMonologueAt: number | null
  /** longest stretch of the client talking (a good sign: they opened up) */
  longestClientStretchSec: number
  /** questions the rep asked (sentences ending in ?), and how they were spread over the call (thirds) */
  repQuestions: number
  questionSpread: [number, number, number]
  /** speaker changes per minute: a conversation, not a presentation */
  switchesPerMin: number
}

const QUESTION = /[?？؟]/g

/** Talk-time and question metrics from the speaker-labelled transcript (no AI involved). */
export function computeMetrics(lines: TranscriptSeg[]): CallMetrics | null {
  const segs = lines.filter((l) => l.end > l.start)
  if (segs.length < 2) return null
  const total = segs[segs.length - 1]!.end - segs[0]!.start || 1
  let rep = 0
  let client = 0
  let switches = 0
  let longest = 0
  let longestAt: number | null = null
  let longestClient = 0
  let runStart = segs[0]!.start
  let runEnd = segs[0]!.end
  let runSpeaker = segs[0]!.speaker
  const closeRun = (): void => {
    const len = runEnd - runStart
    if (runSpeaker === 'rep' && len > longest) {
      longest = len
      longestAt = runStart
    }
    if (runSpeaker === 'client' && len > longestClient) longestClient = len
  }
  const spread: [number, number, number] = [0, 0, 0]
  let questions = 0
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]!
    const d = s.end - s.start
    if (s.speaker === 'rep') {
      rep += d
      const q = (s.text.match(QUESTION) ?? []).length
      questions += q
      // questions usually close a turn: place them where the segment ends
      const third = Math.min(2, Math.floor(((s.end - segs[0]!.start) / total) * 3))
      spread[third as 0 | 1 | 2] += q
    } else client += d
    if (i > 0) {
      if (s.speaker !== runSpeaker) {
        switches++
        closeRun()
        runStart = s.start
        runSpeaker = s.speaker
      }
      runEnd = s.end
    }
  }
  closeRun()
  const spoken = rep + client || 1
  return {
    talkRatioRep: Math.round((rep / spoken) * 100),
    repSeconds: Math.round(rep),
    clientSeconds: Math.round(client),
    longestMonologueSec: Math.round(longest),
    longestMonologueAt: longestAt == null ? null : Math.round(longestAt),
    longestClientStretchSec: Math.round(longestClient),
    repQuestions: questions,
    questionSpread: spread,
    switchesPerMin: Math.round((switches / (total / 60)) * 10) / 10,
  }
}

/** The call score: the rubric average mapped to 0–100 (all 3s = 50, all 4s = 75, all 5s = 100). */
export function scoreFromRubric(scores: Record<string, number>): number {
  const vals = Object.values(scores).filter((v) => Number.isFinite(v))
  if (!vals.length) return 0
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  return Math.max(0, Math.min(100, Math.round(((avg - 1) / 4) * 100)))
}
