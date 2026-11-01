import { describe, expect, it } from 'vitest'
import { organizeNotes, organizedFor } from '../lib/organize-notes'

const NOTES = `# Quick notes
Summary
Ariel and the team discussed onboarding. Pricing was reviewed.
Next steps
• Gabriel to send the proposal by Friday.
• Amitay to book a demo.

# Full notes
Summary
Ariel wants a pilot with 3 sales reps.
Decisions
• Start the pilot on 10 Nov.
Next steps
• Jack to share the contract.
Details
• Pilot scope: Three reps, two weeks, weekly check-ins.
• The team will revisit pricing after the pilot.
Transcript
00:00 blah blah`

describe('organizeNotes', () => {
  it('splits Gemini notes into short lists and drops the transcript', () => {
    const o = organizeNotes(NOTES)!
    expect(o.overview[0]).toMatch(/Ariel and the team/)
    expect(o.decisions).toEqual(['Start the pilot on 10 Nov.'])
    expect(o.actions).toEqual(['Gabriel to send the proposal by Friday.', 'Amitay to book a demo.'])
    expect(o.topics[0]).toEqual({ title: 'Pilot scope', points: ['Three reps, two weeks, weekly check-ins.'] })
    expect(JSON.stringify(o)).not.toContain('blah')
  })
  it('returns null for empty or unstructured text and prefers stored AI output', () => {
    expect(organizeNotes('  ')).toBeNull()
    expect(organizeNotes('just words')).toBeNull()
    const ai = { overview: ['x'], decisions: [], actions: [], topics: [] }
    expect(organizedFor({ organizedJson: ai, fullText: NOTES })).toEqual({ notes: ai, ai: true })
    expect(organizedFor({ organizedJson: { bad: 1 }, fullText: NOTES }).ai).toBe(false)
  })
})

describe('organizedFor with bad stored data', () => {
  it.each([null, 'junk', 42, [], { overview: 'x' }, { overview: [1] }])('falls back without throwing for %j', (bad) => {
    const r = organizedFor({ organizedJson: bad, fullText: 'Summary\nHello team.' })
    expect(r.ai).toBe(false)
    expect(r.notes?.overview).toEqual(['Hello team.'])
  })
  it('returns null notes when there is no text at all', () => {
    expect(organizedFor({ organizedJson: undefined, fullText: null })).toEqual({ notes: null, ai: false })
  })
})
