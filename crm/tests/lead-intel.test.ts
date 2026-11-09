import { describe, expect, it } from 'vitest'
import { CallIntel, mergeIntel, readProfile } from '@/lib/lead-intel'

const base = {
  person: { firstName: null, lastName: null, role: null, email: null, otherPhone: null },
  company: { name: null, industry: null, location: null, size: null, website: null, socials: [] },
  site: { platform: null, notes: null },
  needs: [],
  pains: [],
  budget: null,
  timeline: null,
  decisionMaker: null,
  competitors: [],
  meeting: { booked: false, when: null, durationMin: null, kind: 'unspecified', topic: null, quote: null },
  actionItems: [],
  facts: [],
}
const intel = (over: Record<string, unknown>) => CallIntel.parse({ ...base, ...over })

describe('lead profile from calls', () => {
  it('collects facts, a booked time and next steps from a call', () => {
    const p = mergeIntel(
      null,
      intel({
        person: { ...base.person, firstName: 'Noa', lastName: 'Katz', email: 'Noa@Bloom.co.il' },
        company: { ...base.company, name: 'Bloom Studio', website: 'bloom studio.co.il' },
        needs: ['Online orders'],
        meeting: { booked: true, when: '2026-11-10T15:00', durationMin: null, kind: 'video', topic: 'Concepts', quote: 'tomorrow at three' },
        actionItems: [{ text: 'Send concepts', owner: 'rep', due: '2026-11-10', kind: 'send' }],
      }),
      'call1',
      new Date('2026-11-09T10:00:00Z'),
      'Asia/Jerusalem',
    )
    expect(p.fields.name?.value).toBe('Noa Katz')
    expect(p.fields.email?.value).toBe('noa@bloom.co.il')
    expect(p.fields.company?.value).toBe('Bloom Studio')
    expect(p.meetings).toHaveLength(1)
    expect(p.meetings[0]).toMatchObject({ when: '2026-11-10T15:00', durationMin: 30, timeZone: 'Asia/Jerusalem' })
    expect(p.actionItems[0]).toMatchObject({ text: 'Send concepts', status: 'open', due: '2026-11-10' })
  })

  it('a newer call wins, an older one does not overwrite it, and a re-read replaces that call', () => {
    let p = mergeIntel(null, intel({ budget: 'around 10k' }), 'old', new Date('2026-11-01T10:00:00Z'), 'UTC')
    p = mergeIntel(p, intel({ budget: '15k' }), 'new', new Date('2026-11-05T10:00:00Z'), 'UTC')
    expect(p.fields.budget?.value).toBe('15k')
    p = mergeIntel(p, intel({ budget: 'no idea' }), 'old', new Date('2026-11-01T10:00:00Z'), 'UTC')
    expect(p.fields.budget?.value).toBe('15k')
    p = mergeIntel(p, intel({ budget: '20k' }), 'new', new Date('2026-11-05T10:00:00Z'), 'UTC')
    expect(p.fields.budget?.value).toBe('20k')
    expect(p.calls).toEqual(['old', 'new'])
  })

  it('keeps next steps someone acted on and meetings already on a calendar when a call is read again', () => {
    let p = mergeIntel(
      null,
      intel({ meeting: { booked: true, when: '2026-11-10T15:00', durationMin: 45, kind: 'phone', topic: null, quote: null }, actionItems: [{ text: 'Send proposal', owner: 'rep', due: null, kind: 'send' }] }),
      'c',
      new Date('2026-11-09T10:00:00Z'),
      'UTC',
    )
    p.actionItems[0]!.status = 'tasked'
    p.meetings[0]!.entryId = 'entry1'
    p = mergeIntel(readProfile(JSON.parse(JSON.stringify(p))), intel({ meeting: { booked: true, when: '2026-11-10T15:00', durationMin: 45, kind: 'phone', topic: null, quote: null }, actionItems: [{ text: 'Send proposal', owner: 'rep', due: null, kind: 'send' }] }), 'c', new Date('2026-11-09T10:00:00Z'), 'UTC')
    expect(p.actionItems).toHaveLength(1)
    expect(p.actionItems[0]!.status).toBe('tasked')
    expect(p.meetings).toHaveLength(1)
    expect(p.meetings[0]!.entryId).toBe('entry1')
  })

  it('drops times and due dates that are not real dates', () => {
    const i = intel({ meeting: { booked: true, when: 'next tuesday', durationMin: 30, kind: 'phone', topic: null, quote: null }, actionItems: [{ text: 'Call back', owner: 'rep', due: 'soon', kind: 'call' }] })
    expect(i.meeting.when).toBeNull()
    expect(i.actionItems[0]!.due).toBeNull()
    expect(mergeIntel(null, i, 'c', new Date(), 'UTC').meetings).toHaveLength(0)
  })
})
