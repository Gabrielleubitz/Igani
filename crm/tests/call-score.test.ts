import { describe, expect, it } from 'vitest'
import type { CallMetrics } from '@/lib/call-coaching'
import { buildScore, callStage, deliveryMetrics, paceScore, type ScoreInput } from '@/lib/call-score'

const metrics = (over: Partial<CallMetrics> = {}): CallMetrics => ({ talkRatioRep: 45, repSeconds: 270, clientSeconds: 330, longestMonologueSec: 60, longestMonologueAt: 30, longestClientStretchSec: 50, repQuestions: 12, questionSpread: [4, 4, 4], switchesPerMin: 4, ...over })

const call = (over: Partial<ScoreInput> = {}): ScoreInput => ({
  isSalesCall: true,
  callType: 'Discovery call',
  lang: 'en',
  scores: { opening: 3, discovery: 3, value: 3, objections: 3, closing: 3 },
  straightLine: { scores: { rapport: 4, intelligence: 4, control: 4, threeTens: 4, looping: null, closing: 4 }, checks: [] },
  metrics: metrics(),
  delivery: { repWpm: 150, fillersPerMin: 1, fillers: [] },
  tonality: { dims: { certainty: 4, enthusiasm: 4, warmth: 4, pace: 4, variety: 4, composure: 4 }, summary: '', clientMood: 'warming', moments: [] },
  nextStep: 'Demo Sunday 10:00',
  nextStepQuality: 'specific',
  outcome: { score: 80 },
  ...over,
})

describe('call score', () => {
  it('weights skills 40, tonality 25, conversation 15, result 20', () => {
    const s = buildScore(call())
    expect(s.parts.map((p) => [p.key, Math.round(p.weight * 100)])).toEqual([['skills', 40], ['tonality', 25], ['conversation', 15], ['result', 20]])
    // skills 75, tonality 75*.8 + pace 100*.2 = 80, conversation 100, result 100*.6 + 80*.4 = 92
    expect(s.parts.map((p) => p.score)).toEqual([75, 80, 100, 92])
    expect(s.total).toBe(Math.round(75 * 0.4 + 80 * 0.25 + 100 * 0.15 + 92 * 0.2))
    expect(s.lift?.key).toBe('skills')
  })

  it('hears the voice: a flat, nervous delivery costs points even when the words were right', () => {
    const flat = buildScore(call({ tonality: { dims: { certainty: 2, enthusiasm: 1, warmth: 2, pace: 2, variety: 1, composure: 2 }, summary: '', clientMood: 'cooling', moments: [] } }))
    expect(flat.total).toBeLessThan(buildScore(call()).total - 10)
    expect(flat.parts.find((p) => p.key === 'tonality')!.why).toMatch(/weakest on energy/)
  })

  it('without the audio judgement, pace alone counts for less', () => {
    const s = buildScore(call({ tonality: null }))
    const t = s.parts.find((p) => p.key === 'tonality')!
    expect(t.score).toBe(100)
    expect(t.weight).toBeCloseTo(8 / 83)
    expect(t.why).toMatch(/Pace only/)
  })

  it('judges talk share by the call stage', () => {
    const talky = metrics({ talkRatioRep: 68 })
    expect(buildScore(call({ metrics: talky })).parts.find((p) => p.key === 'conversation')!.why).toMatch(/you talked 68%/)
    // the same share is fine on a demo
    const demo = buildScore(call({ callType: 'Demo / proposal walk-through', metrics: talky })).parts.find((p) => p.key === 'conversation')!
    expect(demo.score).toBeGreaterThan(buildScore(call({ metrics: talky })).parts.find((p) => p.key === 'conversation')!.score)
  })

  it('rewards a specific next step over a vague one or none', () => {
    const r = (q: ScoreInput['nextStepQuality']) => buildScore(call({ nextStepQuality: q })).parts.find((p) => p.key === 'result')!.score
    expect(r('specific')).toBeGreaterThan(r('vague'))
    expect(r('vague')).toBeGreaterThan(r('none'))
  })

  it('caps the score when the rep pressured or was not honest', () => {
    const s = buildScore(call({ straightLine: { scores: { rapport: 5, intelligence: 5, control: 5, threeTens: 5, looping: 5, closing: 5 }, checks: [{ id: 'honest-no-pressure', result: 'no' }] } }))
    expect(s.total).toBe(55)
    expect(s.capped).toMatch(/pressure/)
  })

  it('leaves out what it cannot judge and re-weights the rest', () => {
    const s = buildScore(call({ metrics: undefined, delivery: null, tonality: null }))
    expect(s.parts.map((p) => p.key)).toEqual(['skills', 'result'])
    expect(s.parts.reduce((t, p) => t + p.weight, 0)).toBeCloseTo(1)
  })
})

describe('delivery metrics', () => {
  it('measures the rep’s pace and filler words, in English and Hebrew', () => {
    const d = deliveryMetrics([
      { start: 0, end: 30, speaker: 'rep', text: Array(60).fill('word').join(' ') + ' um you know' },
      { start: 30, end: 40, speaker: 'client', text: 'um ok' },
      { start: 40, end: 70, speaker: 'rep', text: 'כאילו ' + Array(70).fill('מילה').join(' ') + ' אממ' },
    ])!
    expect(d.repWpm).toBe(Math.round(135 / 1)) // 135 words in 60 s
    expect(d.fillersPerMin).toBe(4) // um, you know, כאילו, אממ (the client's "um" doesn't count)
  })
  it('needs enough of the rep speaking', () => {
    expect(deliveryMetrics([{ start: 0, end: 5, speaker: 'rep', text: 'hi' }])).toBeNull()
  })
  it('pace targets differ for Hebrew and English', () => {
    expect(paceScore(110, 'he')).toBe(100)
    expect(paceScore(110, 'en')).toBeLessThan(100)
    expect(paceScore(230, 'en')).toBeLessThan(paceScore(190, 'en'))
  })
  it('reads the call stage from its type', () => {
    expect(callStage('Discovery call')).toBe('discovery')
    expect(callStage('Proposal walk-through')).toBe('presentation')
    expect(callStage('Closing call')).toBe('closing')
    expect(callStage('Support')).toBe('other')
  })
})
