import { describe, expect, it } from 'vitest'
import type { CallAnalysis } from '@/lib/call-analysis'
import { clip, coachFrom, firstSentence, mentionsMoney } from '@/lib/call-coach'

const base = (over: Record<string, unknown> = {}): CallAnalysis =>
  ({
    isSalesCall: true,
    summary: 'The rep opened well and booked a demo. The client was interested.',
    strengths: ['You asked a clear opening question.', 'You booked a time before hanging up.'],
    improvements: ['You pitched before asking what the site does.'],
    moments: [{ at: 18, step: 'intelligence', clientSaid: null, repSaid: 'x', better: 'What does the site mainly do for you today?', why: 'Ask first, then explain.' }],
    focus: [{ skill: 'Questions', why: 'w', drill: 'Ask three questions before any explanation.', sayThis: 'Before I explain, what is the site for today?' }],
    straightLine: { verdict: 'You got a demo booked, but pitched too early.', scores: {}, checks: [], lessons: [] },
    ...over,
  }) as unknown as CallAnalysis

describe('coachFrom', () => {
  it('fills the five parts in order from the stored fields', () => {
    const c = coachFrom(base(), { total: 72.4 })
    expect(c).toMatchObject({
      notSales: false,
      score: 72,
      verdict: 'You got a demo booked, but pitched too early.',
      win: 'You asked a clear opening question.',
      fix: 'You pitched before asking what the site does.',
      say: 'Before I explain, what is the site for today?',
      challenge: { skill: 'Questions', text: 'Ask three questions before any explanation.' },
      momentAt: 18,
      sparse: false,
    })
  })

  it('falls back to the summary, the moments and the next strength when a field is missing', () => {
    const c = coachFrom(base({ straightLine: undefined, improvements: [], focus: undefined }), { total: 50 })
    expect(c.verdict).toBe('The rep opened well and booked a demo.')
    expect(c.fix).toBe('Ask first, then explain.')
    expect(c.say).toBe('What does the site mainly do for you today?')
    expect(c.challenge).toBeNull()
  })

  it('never shows the same text twice', () => {
    const c = coachFrom(base({ improvements: ['You asked a clear opening question.'], strengths: ['You asked a clear opening question.', 'Calm tone throughout the conversation.'] }), { total: 60 })
    expect(c.win).toBe('You asked a clear opening question.')
    expect(c.fix).not.toBe(c.win)
    expect(c.fix).toBe('Ask first, then explain.')
  })

  it('skips anything that mentions money and takes the next candidate', () => {
    const c = coachFrom(base({ strengths: ['You handled the ₪5,000 budget question well.', 'You listened carefully.'], summary: 'Their budget is 20k.' , straightLine: undefined}), { total: 60 })
    expect(c.win).toBe('You listened carefully.')
    expect(c.verdict).toBeNull()
    expect(mentionsMoney('the budget')).toBe(true)
    expect(mentionsMoney('He asked about price')).toBe(true)
    expect(mentionsMoney('You listened well')).toBe(false)
  })

  it('marks a card with too little to coach from as sparse, without inventing text', () => {
    const c = coachFrom(base({ strengths: [], improvements: [], moments: [], focus: undefined }), { total: 40 })
    expect(c).toMatchObject({ win: null, fix: null, say: null, challenge: null, sparse: true })
    expect(c.score).toBe(40)
  })

  it('has no coaching for a call that was not a sales call', () => {
    expect(coachFrom(base({ isSalesCall: false }), { total: 0 })).toMatchObject({ notSales: true, score: null, win: null, say: null })
  })

  it('trims long text at a word and leaves Hebrew alone', () => {
    const long = 'word '.repeat(80)
    const c = coachFrom(base({ strengths: [long] }), { total: 60 })
    expect(c.win!.length).toBeLessThanOrEqual(161)
    expect(c.win!.endsWith('…')).toBe(true)
    expect(coachFrom(base({ strengths: ['שאלת שאלה פתיחה ברורה'] }), { total: 60 }).win).toBe('שאלת שאלה פתיחה ברורה')
    expect(clip('short text')).toBe('short text')
    expect(firstSentence('One. Two.')).toBe('One.')
    expect(firstSentence('No end here')).toBe('No end here')
  })
})
