import { describe, expect, it } from 'vitest'
import { MAX_CLICKS, TrackBatch, heatPoints, mergeVisit, offerStats, sectionLabel, visitStillOpen } from '@/lib/offer-tracking'

const batch = (over: Partial<TrackBatch> = {}): TrackBatch => ({
  key: 'k-0123456789abcdef',
  visitorId: 'v-0123456789abcdef',
  device: 'desktop',
  vw: 1280,
  vh: 800,
  durationMs: 5000,
  maxScroll: 40,
  sections: { overview: 3000 },
  clicks: [{ s: 'modules', x: 0.5, y: 0.25, t: 1200, l: 'Add module' }],
  moves: [{ s: 'overview', x: 0.1, y: 0.2 }],
  ...over,
})

describe('offer tracking', () => {
  it('accepts a normal batch and rejects bad shapes', () => {
    expect(TrackBatch.safeParse(batch()).success).toBe(true)
    expect(TrackBatch.safeParse({ ...batch(), key: 'short' }).success).toBe(false)
    expect(TrackBatch.safeParse({ ...batch(), clicks: [{ s: 'x', x: 2, y: 0, t: 0 }] }).success).toBe(false) // outside the section
    expect(TrackBatch.safeParse({ ...batch(), sections: { 'Bad Id<script>': 1 } }).success).toBe(false)
    expect(TrackBatch.safeParse({ ...batch(), moves: Array.from({ length: 401 }, () => ({ s: 'a', x: 0, y: 0 })) }).success).toBe(false)
  })

  it('totals only go up, lists append, per-section time keeps the larger number', () => {
    const a = mergeVisit(null, batch())
    const b = mergeVisit(a, batch({ durationMs: 3000, maxScroll: 80, sections: { overview: 2000, sign: 1500 } }))
    expect(b.durationMs).toBe(5000) // an older batch arriving late never lowers time
    expect(b.maxScrollPct).toBe(80)
    expect(b.sections).toEqual({ overview: 3000, sign: 1500 })
    expect(b.clicks).toHaveLength(2)
    expect(b.moves).toHaveLength(2)
  })

  it('caps the stored clicks', () => {
    let v = mergeVisit(null, batch({ clicks: [] }))
    const many = Array.from({ length: 60 }, (_, i) => ({ s: 'sign', x: 0.1, y: 0.1, t: i }))
    for (let i = 0; i < 10; i++) v = mergeVisit(v, batch({ clicks: many }))
    expect(v.clicks).toHaveLength(MAX_CLICKS)
  })

  it('a visit can be extended for six hours only', () => {
    const now = new Date('2026-11-04T12:00:00Z')
    expect(visitStillOpen(new Date('2026-11-04T07:00:00Z'), now)).toBe(true)
    expect(visitStillOpen(new Date('2026-11-04T05:00:00Z'), now)).toBe(false)
  })

  it('summarises reach, attention, returning visitors and clicks', () => {
    const row = (visitorId: string, scroll: number, sections: Record<string, number>, clicks: { l?: string }[] = []) => ({ visitorId, startedAt: new Date(), durationMs: 60_000, maxScrollPct: scroll, device: 'desktop', sections, clicks })
    const s = offerStats(
      [row('a', 100, { overview: 10_000, sign: 4000 }, [{ l: 'Sign' }, { l: 'Sign' }]), row('a', 50, { overview: 1000 }), row('b', 30, { modules: 20_000 }, [{ l: 'Pay' }])],
      ['overview', 'modules', 'sign'],
    )
    expect(s).toMatchObject({ visits: 3, visitors: 2, returning: 1, avgSeconds: 60, avgScroll: 60 })
    expect(s.reach).toEqual([
      { at: 25, pct: 100 },
      { at: 50, pct: 67 },
      { at: 75, pct: 33 },
      { at: 100, pct: 33 },
    ])
    expect(s.sections.map((x) => x.id)).toEqual(['overview', 'modules', 'sign']) // page order; 1 s glance at overview not counted
    expect(s.sections[0]).toMatchObject({ seenPct: 33, avgSeconds: 10 })
    expect(s.topClicks[0]).toEqual({ label: 'Sign', count: 2 })
  })

  it('thins heat points evenly and indexes sections', () => {
    const pts = Array.from({ length: 1000 }, (_, i) => ({ s: i % 2 ? 'a' : 'b', x: 0.5, y: 0.5 }))
    const h = heatPoints([pts], 100)
    expect(h.points).toHaveLength(100)
    expect(h.sections.sort()).toEqual(['a', 'b'])
  })

  it('names sections for people', () => {
    expect(sectionLabel('modules')).toBe('Modules & prices')
    expect(sectionLabel('flow-staff')).toBe('Screens · staff')
  })
})

describe('offer tracking caps', () => {
  it('a visit never stores more than 40 sections, however many batches arrive', async () => {
    const { MAX_SECTIONS } = await import('@/lib/offer-tracking')
    let v = mergeVisit(null, batch({ sections: {} }))
    for (let i = 0; i < 20; i++) v = mergeVisit(v, batch({ sections: Object.fromEntries(Array.from({ length: 40 }, (_, k) => [`junk-${i}-${k}`, 1])) }))
    expect(Object.keys(v.sections)).toHaveLength(MAX_SECTIONS)
  })
})
