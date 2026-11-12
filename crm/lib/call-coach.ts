import type { CallAnalysis } from '@/lib/call-analysis'

/**
 * The short coaching card shown right after a call: score and verdict, one win, one improvement, one sentence to try,
 * one challenge. Built only from fields the review already stores: no AI, no invented text. Pure and serialisable.
 */
export interface CoachCard {
  /** not a sales call: no coaching, just the line saying so */
  notSales: boolean
  score: number | null
  verdict: string | null
  win: string | null
  fix: string | null
  say: string | null
  challenge: { skill: string | null; text: string } | null
  /** seconds into the call of the first moment, for a "Hear it" link */
  momentAt: number | null
  /** too little to coach from: show the score and a plain line instead */
  sparse: boolean
}

const CLIP = 160

/** Cut at a word boundary with an ellipsis (the full text is on the review page). */
export function clip(text: string, max = CLIP): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const at = cut.lastIndexOf(' ')
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:.\-–—]+$/, '')}…`
}

/** The first sentence (up to a . ! ? or Hebrew-friendly line end). */
export function firstSentence(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim()
  const m = t.match(/^.*?[.!?](?=\s|$)/)
  return (m ? m[0] : t).trim()
}

/** A figure or a word about money: never put these on the card (the client's budget stays on the review page). */
const MONEY = /[₪$€£]|\b(budget|shekels?|nis|usd|dollars?|euros?|price|pricing)\b|תקציב|שקל|מחיר/iu
export const mentionsMoney = (t: string): boolean => MONEY.test(t)

const norm = (t: string): string => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const same = (a: string, b: string): boolean => {
  const x = norm(a)
  const y = norm(b)
  if (!x || !y) return false
  return x === y || (Math.min(x.length, y.length) > 20 && (x.includes(y) || y.includes(x)))
}

/** The first candidate that is real text, safe, and not a repeat of anything already used. */
function pick(candidates: (string | null | undefined)[], used: string[]): string | null {
  for (const c of candidates) {
    const t = (c ?? '').replace(/\s+/g, ' ').trim()
    if (!t || mentionsMoney(t) || used.some((u) => same(u, t))) continue
    return clip(t)
  }
  return null
}

export function coachFrom(a: CallAnalysis, score: { total: number }): CoachCard {
  if (!a.isSalesCall) return { notSales: true, score: null, verdict: null, win: null, fix: null, say: null, challenge: null, momentAt: null, sparse: false }
  const used: string[] = []
  const take = (c: (string | null | undefined)[]): string | null => {
    const v = pick(c, used)
    if (v) used.push(v)
    return v
  }
  const verdict = take([a.straightLine?.verdict, firstSentence(a.summary)])
  const win = take([...a.strengths])
  const fix = take([...a.improvements, ...a.moments.map((m) => m.why)])
  const say = take([a.focus?.[0]?.sayThis, ...a.moments.map((m) => m.better)])
  const drill = take([a.focus?.[0]?.drill])
  const skill = a.focus?.[0]?.skill?.trim() ?? null
  const momentAt = a.moments.find((m) => m.at !== null && m.at >= 0)?.at ?? null
  const have = [win, fix, say].filter(Boolean).length
  return {
    notSales: false,
    score: Math.round(score.total),
    verdict,
    win,
    fix,
    say,
    challenge: drill ? { skill: skill ? clip(skill, 60) : null, text: drill } : null,
    momentAt,
    sparse: have < 2,
  }
}
