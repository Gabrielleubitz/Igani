import { describe, expect, it } from 'vitest'
import { HINT_SCHEMA, LIVE_HINT_RULES, acceptHint, cleanSpeech, trimContext } from '@/lib/live-hints-core'

describe('live hints rules', () => {
  it('drops silence hallucinations and one-word noise but keeps real speech', () => {
    for (const t of ['', '  ', 'Thank you.', 'you', 'Bye.', '...', 'Okay.', 'mm']) expect(cleanSpeech(t)).toBe('')
    expect(cleanSpeech('We need a booking system for the clinic')).toBe('We need a booking system for the clinic')
    expect(cleanSpeech('Yes, definitely')).toBe('Yes, definitely')
  })
  it('keeps only the tail of the running transcript, cut at a line start', () => {
    const ctx = Array.from({ length: 200 }, (_, i) => `REP: line number ${i}`).join('\n')
    const t = trimContext(ctx, 300)
    expect(t.length).toBeLessThanOrEqual(300)
    expect(t.startsWith('REP: line number')).toBe(true)
    expect(t.endsWith('line number 199')).toBe(true)
    expect(trimContext('short', 300)).toBe('short')
  })
  it('accepts a short new hint and rejects empty, long or repeated ones', () => {
    const h = { text: 'Ask what their biggest headache is', step: 'intelligence' as const, tone: 'do' as const }
    expect(acceptHint(h, [])).toMatchObject({ text: 'Ask what their biggest headache is' })
    expect(acceptHint(null, [])).toBeNull()
    expect(acceptHint({ ...h, text: 'x' }, [])).toBeNull()
    expect(acceptHint({ ...h, text: 'a'.repeat(200) }, [])).toBeNull()
    expect(acceptHint(h, ['ask what their BIGGEST headache is!'])).toBeNull()
  })
  it('has a strict schema and the ethics rule in the coach prompt', () => {
    expect(HINT_SCHEMA.required).toEqual(['hint', 'step', 'tone'])
    expect(LIVE_HINT_RULES).toMatch(/never pressure/i)
    expect(LIVE_HINT_RULES).toMatch(/at most ONE/)
  })
})
