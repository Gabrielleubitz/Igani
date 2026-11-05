import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/lib/call-recording', () => ({ ensureRecordingSid: async () => null, fetchRecordingAudio: async () => null }))
vi.mock('@/lib/audit', () => ({ logActivity: async () => undefined }))

import { CallAnalysis, scoreFromAnalysis } from '@/lib/call-analysis'

const base = {
  isSalesCall: true, callType: 'Discovery call', language: 'en', summary: 's', outcome: { label: 'ok', score: 60 }, sentiment: 'neutral', nextStep: null,
  clientNeeds: [], objections: [], actionItems: [], talkRatioRep: 50, questionsAsked: 5, scores: { opening: 3, discovery: 3, value: 3, objections: 3, closing: 3 },
  overallScore: 50, strengths: [], improvements: [], moments: [],
}

describe('Straight Line block in the call analysis', () => {
  it('still reads analyses saved without it', () => {
    expect(CallAnalysis.parse(base).straightLine).toBeUndefined()
  })
  it('keeps known checks, snaps lessons to real index entries, dedupes and limits to 3', () => {
    const a = CallAnalysis.parse({
      ...base,
      straightLine: {
        scores: { rapport: 4, intelligence: 2, control: null, threeTens: 3, looping: 7, closing: 3 },
        checks: [{ id: 'qualify-first', result: 'no', evidence: 'quote' }, { id: 'made-up', result: 'yes', evidence: null }],
        lessons: [{ ep: 3, startSec: 1580, why: 'a' }, { ep: 3, startSec: 1575, why: 'dup' }, { ep: 7, startSec: 450, why: 'b' }, { ep: 9, startSec: 0, why: 'c' }, { ep: 8, startSec: 10, why: 'd' }, { ep: 50, startSec: 1, why: 'bad' }],
      },
    })
    expect(a.straightLine?.scores).toMatchObject({ rapport: 4, control: null, looping: 5 })
    expect(a.straightLine?.checks.map((c) => c.id)).toEqual(['qualify-first'])
    expect(a.straightLine?.lessons).toHaveLength(3)
    expect(a.straightLine?.lessons[0]).toMatchObject({ ep: 3, startSec: 1574 })
    expect(a.straightLine?.lessons.map((l) => l.ep)).toEqual([3, 7, 9])
  })
  it('scores the skills part by the Straight Line skills, skipping not-applicable ones, and falls back to the old rubric', () => {
    const sl = (scores: Record<string, number | null>) => CallAnalysis.parse({ ...base, straightLine: { verdict: 'v', scores: { rapport: null, intelligence: null, control: null, threeTens: null, looping: null, closing: null, ...scores }, checks: [], lessons: [] } })
    // same average (4) whichever skills applied
    expect(scoreFromAnalysis(sl({ rapport: 3, closing: 5 }))).toBe(scoreFromAnalysis(sl({ rapport: 4, intelligence: 4, control: 4 })))
    expect(scoreFromAnalysis(sl({ rapport: 4, intelligence: 4, control: 4 }))).toBeGreaterThan(scoreFromAnalysis(sl({ rapport: 3, intelligence: 3 })))
    // all not applicable: the old rubric (all 3s), same as an analysis without the block
    expect(scoreFromAnalysis(sl({}))).toBe(scoreFromAnalysis(CallAnalysis.parse(base)))
  })
  it('keeps the evidence line per skill', () => {
    const a = CallAnalysis.parse({ ...base, straightLine: { verdict: 'v', scores: { rapport: 4, intelligence: null, control: null, threeTens: null, looping: null, closing: null }, why: { rapport: '  "Hi Dana, great to catch you"  ', intelligence: null, control: '' }, checks: [], lessons: [] } })
    expect(a.straightLine?.why).toEqual({ rapport: '"Hi Dana, great to catch you"' })
  })
  it('scores every saved analysis with the current formula when read', async () => {
    const { asAnalysis } = await import('@/lib/call-analysis')
    expect(asAnalysis({ ...base, overallScore: 99 })!.overallScore).toBe(scoreFromAnalysis(CallAnalysis.parse(base)))
    expect(asAnalysis({ ...base, v: 3, overallScore: 0 })!.overallScore).toBe(scoreFromAnalysis(CallAnalysis.parse(base)))
  })
  it('keeps the step on a moment and drops unknown steps', () => {
    const a = CallAnalysis.parse({ ...base, moments: [{ at: 10, step: 'looping', clientSaid: null, repSaid: 'a', better: 'b', why: 'c' }, { at: 20, step: 'nonsense', clientSaid: null, repSaid: 'a', better: 'b', why: 'c' }, { at: 30, clientSaid: null, repSaid: 'a', better: 'b', why: 'c' }] })
    expect(a.moments.map((m) => m.step)).toEqual(['looping', null, null])
  })
})
