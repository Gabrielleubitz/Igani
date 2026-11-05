import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/lib/call-recording', () => ({ ensureRecordingSid: async () => null, fetchRecordingAudio: async () => null }))
vi.mock('@/lib/audit', () => ({ logActivity: async () => undefined }))

import { CallAnalysis } from '@/lib/call-analysis'

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
})
