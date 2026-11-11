import { describe, expect, it } from 'vitest'
import { followUpReason, pickChannel, type FollowUpSignals } from '../lib/follow-up-rules'

const NOW = new Date('2026-11-12T10:00:00Z')
const daysAgo = (d: number): Date => new Date(NOW.getTime() - d * 86_400_000)
const sig = (o: Partial<FollowUpSignals>): FollowUpSignals => ({ status: 'INTERESTED', lastIn: null, lastOut: null, openItems: [], lastInKind: null, ...o })

describe('when a conversation needs a follow-up', () => {
  it('flags a client message we never answered, after a day', () => {
    expect(followUpReason(sig({ lastIn: daysAgo(2), lastOut: daysAgo(5), lastInKind: 'email' }), NOW)).toMatchObject({ kind: 'unanswered' })
    expect(followUpReason(sig({ lastIn: daysAgo(2), lastInKind: 'sms' }), NOW)?.text).toMatch(/^They texted on/)
    // too fresh: give the rep a day
    expect(followUpReason(sig({ lastIn: daysAgo(0.5), lastOut: daysAgo(5) }), NOW)).toBeNull()
  })

  it('flags a promise we made on a call with nothing sent since', () => {
    const call = daysAgo(3)
    const r = followUpReason(sig({ lastIn: call, lastOut: call, openItems: [{ text: 'I will send the quote', owner: 'rep', at: call }] }), NOW)
    expect(r).toMatchObject({ kind: 'promise' })
    expect(r?.text).toContain("You said you'd send the quote")
    // we wrote to them after the call: the promise isn't the reason any more (and 1 day is too soon for "quiet")
    expect(followUpReason(sig({ lastIn: call, lastOut: daysAgo(1), openItems: [{ text: 'send the quote', owner: 'rep', at: call }] }), NOW)).toBeNull()
  })

  it('flags silence after our last message once 4 days pass', () => {
    expect(followUpReason(sig({ lastIn: daysAgo(10), lastOut: daysAgo(5) }), NOW)).toMatchObject({ kind: 'quiet' })
    expect(followUpReason(sig({ lastIn: daysAgo(10), lastOut: daysAgo(3) }), NOW)).toBeNull()
    expect(followUpReason(sig({ lastOut: daysAgo(6), openItems: [{ text: 'check with their partner', owner: 'client', at: daysAgo(6) }] }), NOW)?.text).toContain('They were going to check with their partner')
  })

  it('leaves closed deals, cold threads and never-contacted leads alone', () => {
    expect(followUpReason(sig({ status: 'WON', lastIn: daysAgo(2), lastOut: daysAgo(5) }), NOW)).toBeNull()
    expect(followUpReason(sig({ status: 'LOST', lastOut: daysAgo(6) }), NOW)).toBeNull()
    expect(followUpReason(sig({ lastIn: daysAgo(60), lastOut: daysAgo(50) }), NOW)).toBeNull()
    expect(followUpReason(sig({}), NOW)).toBeNull()
  })
})

describe('which channel to follow up on', () => {
  it('answers on the channel they used, when we can', () => {
    expect(pickChannel({ email: 'a@b.co', phone: '+972501234567', lastInKind: 'sms', lastOutKind: 'email' })).toBe('sms')
    expect(pickChannel({ email: 'a@b.co', phone: '+972501234567', lastInKind: 'call', lastOutKind: 'email' })).toBe('email')
    expect(pickChannel({ email: null, phone: '+972501234567', lastInKind: 'email', lastOutKind: null })).toBe('sms')
    expect(pickChannel({ email: 'a@b.co', phone: null, lastInKind: 'call', lastOutKind: 'call' })).toBe('email')
    expect(pickChannel({ email: null, phone: null, lastInKind: null, lastOutKind: null })).toBeNull()
  })
})
