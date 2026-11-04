import { describe, expect, it } from 'vitest'
import { computeMetrics, scoreFromRubric } from '@/lib/call-coaching'
import { CallAnalysis } from '@/lib/call-analysis'

const seg = (start: number, end: number, speaker: 'rep' | 'client', text: string) => ({ start, end, speaker, text })

describe('call coaching metrics', () => {
  it('measures talk ratio, monologues, questions and their spread from the timestamps', () => {
    const m = computeMetrics([
      seg(0, 10, 'rep', 'Hi Dana, Gabriel from Igani. Do you have two minutes?'),
      seg(10, 40, 'client', 'Sure. We take bookings on WhatsApp and it is a mess.'),
      seg(40, 60, 'rep', 'How many bookings a week? What does a no-show cost you?'),
      seg(60, 70, 'client', 'About a hundred. A lot.'),
      seg(70, 100, 'rep', 'Here is what we build.'),
      seg(100, 160, 'rep', 'Deposits, reminders, a back office. Can we book a demo Sunday at 10?'),
    ])!
    expect(m.talkRatioRep).toBe(75) // 120 of 160 s
    expect(m.longestMonologueSec).toBe(90) // 70 → 160, two rep segments in a row
    expect(m.longestMonologueAt).toBe(70)
    expect(m.longestClientStretchSec).toBe(30)
    expect(m.repQuestions).toBe(4)
    expect(m.questionSpread).toEqual([1, 2, 1])
    expect(m.switchesPerMin).toBe(1.5) // 4 switches in 160 s
  })

  it('counts Hebrew questions too, and needs at least two segments', () => {
    expect(computeMetrics([seg(0, 5, 'rep', 'כמה הזמנות יש לכם בשבוע?'), seg(5, 9, 'client', 'בערך מאה.')])!.repQuestions).toBe(1)
    expect(computeMetrics([seg(0, 5, 'rep', 'hello')])).toBeNull()
  })

  it('maps the rubric to a consistent 0–100 score', () => {
    expect(scoreFromRubric({ a: 3, b: 3, c: 3 })).toBe(50)
    expect(scoreFromRubric({ a: 4, b: 4 })).toBe(75)
    expect(scoreFromRubric({ a: 5, b: 5 })).toBe(100)
    expect(scoreFromRubric({ a: 1 })).toBe(0)
  })

  it('analyses saved before the upgrade still read', () => {
    const old = { isSalesCall: true, callType: 'Discovery call', language: 'English', summary: 's', outcome: { label: 'x', score: 50 }, sentiment: 'neutral', nextStep: null, clientNeeds: [], objections: [], actionItems: [], talkRatioRep: 50, questionsAsked: 3, scores: { opening: 3, discovery: 3, value: 3, objections: 3, closing: 3 }, overallScore: 50, strengths: [], improvements: [], moments: [] }
    expect(CallAnalysis.safeParse(old).success).toBe(true)
  })
})
