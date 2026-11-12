import { describe, expect, it } from 'vitest'
import { challengesFrom, insightBullets, interactionSplit, sentimentFrom, type CallRead } from '@/lib/lead-catchup'
import type { TimelineItem } from '@/lib/lead-timeline'

const read = (sentiment: CallRead['sentiment'], extra: Partial<CallRead> = {}): CallRead => ({ sentiment, summary: null, nextStep: null, objections: [], at: '2026-11-10T09:00:00Z', ...extra })
const now = new Date('2026-11-12T12:00:00Z')

describe('lead catch-up', () => {
  it('reads the mood from the last calls, newest counting most', () => {
    expect(sentimentFrom([])).toBeNull()
    expect(sentimentFrom([read(null)])).toBeNull()
    expect(sentimentFrom([read('positive'), read('positive')])).toMatchObject({ label: 'Receptive', calls: 2 })
    expect(sentimentFrom([read('negative'), read('negative')])?.label).toBe('Cooling')
    expect(sentimentFrom([read('neutral')])?.label).toBe('Neutral')
    // newest positive outweighs an older negative
    expect(sentimentFrom([read('positive'), read('negative')])?.label).toBe('Receptive')
    expect(sentimentFrom([read('negative'), read('positive')])?.label).toBe('Cooling')
  })

  it('joins pains and objections without repeats', () => {
    expect(challengesFrom(['Slow site', 'No leads'], [read('neutral', { objections: ['slow site', 'Too expensive'] })])).toEqual(['Slow site', 'No leads', 'Too expensive'])
    expect(challengesFrom([], [])).toEqual([])
  })

  const item = (id: string, kind: TimelineItem['kind'], dir: TimelineItem['dir'], at: string): TimelineItem => ({ id, kind, title: id, at, actor: '', group: 'past', ...(dir ? { dir } : {}) })
  it('splits inbound and outbound and says who spoke last', () => {
    const r = interactionSplit([item('in1', 'email', 'in', '2026-11-11T09:00:00Z'), item('out1', 'call', 'out', '2026-11-10T09:00:00Z'), item('n', 'note', undefined, '2026-11-12T09:00:00Z')], now)
    expect(r.inbound.map((i) => i.id)).toEqual(['in1'])
    expect(r.outbound.map((i) => i.id)).toEqual(['out1'])
    expect(r.status).toContain('waiting for us')
    expect(interactionSplit([], now).status).toMatch(/No emails/)
    expect(interactionSplit([item('o', 'sms', 'out', '2026-11-12T08:00:00Z')], now).status).toMatch(/haven’t reached out/)
  })

  it('builds the insight bullets', () => {
    const b = insightBullets({ reads: [read('positive', { summary: 'Interested in a new site', nextStep: 'Demo Thursday' })], nextTask: { title: 'Send quote', due: 'Fri 14:00' }, nextMeeting: null, profileNeeds: ['Booking', 'Payments'] })
    expect(b.map((x) => x.label)).toEqual(['Latest call', 'Next step agreed', 'What they want', 'Open task'])
  })
})
