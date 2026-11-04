import { describe, expect, it } from 'vitest'
import { classifyActions, matchPerson, planMeetingTasks, splitAction } from '@/lib/meeting-tasks'

const people = [
  { id: 'u1', name: 'Dana Cohen', email: 'dana@igani.co' },
  { id: 'u2', name: 'Gabriel Leubitz', email: 'gabriel@igani.co' },
  { id: 'u3', name: 'Dana Levi', email: 'dl@igani.co' },
]

describe('meeting action items -> tasks', () => {
  it('splits "Who: task"', () => {
    expect(splitAction('Gabriel: send the proposal')).toEqual({ who: 'Gabriel', title: 'send the proposal' })
    expect(splitAction('[Ilan Leubitz] Run ads: now')).toEqual({ who: 'Ilan Leubitz', title: 'Run ads: now' })
    expect(splitAction('Send the proposal')).toEqual({ who: null, title: 'Send the proposal' })
    expect(splitAction('Note that the plan is: wait').who).toBeNull()
  })
  it('matches by first name or email prefix, not when ambiguous', () => {
    expect(matchPerson('Gabriel', people)?.id).toBe('u2')
    expect(matchPerson('dl', people)?.id).toBe('u3')
    expect(matchPerson('Dana', people)).toBeNull()
  })
  it('matches the full Google name Gemini writes, even when the CRM only has a first name (and the reverse)', () => {
    const team = [
      { id: 'g', name: 'Gabriel', email: 'gabrielleubitz@igani.co' },
      { id: 'r', name: 'Rita Rep', email: 'rep@igani.co' },
    ]
    expect(matchPerson('Gabriel Leubitz', team)?.id).toBe('g')
    expect(matchPerson('gabrielleubitz', team)?.id).toBe('g')
    expect(matchPerson('Rita', team)?.id).toBe('r')
    expect(matchPerson('Rita Rep', team)?.id).toBe('r')
    expect(matchPerson('Sarah Klein', team)).toBeNull()
    // two Danas: an exact full name is still clear, a first name alone is not
    expect(matchPerson('Dana Cohen', people)?.id).toBe('u1')
    expect(matchPerson('Dana', people)).toBeNull()
  })
  it('unmatched owners go to the host', () => {
    expect(planMeetingTasks(['Gabriel: ship it', 'Dana: call back', 'Review deck'], people, 'u1')).toEqual([
      { assigneeId: 'u2', title: 'Ship it' },
      { assigneeId: 'u1', title: 'Call back' },
      { assigneeId: 'u1', title: 'Review deck' },
    ])
  })
})

describe('follow-ups for people outside the team', () => {
  it('named non-teammates become follow-ups, not host tasks', async () => {
    const { classifyActions } = await import('@/lib/meeting-tasks')
    const r = classifyActions(['Gabriel: ship it', 'Sarah: sign contract', 'Review deck', 'Dana: call back'], people, 'u1')
    expect(r.tasks).toEqual([
      { assigneeId: 'u2', title: 'Ship it' },
      { assigneeId: 'u1', title: 'Review deck' },
      { assigneeId: 'u1', title: 'Call back' },
    ])
    expect(r.followUps).toEqual([{ who: 'Sarah', title: 'Sign contract' }])
  })
})

describe('bracketed Gemini lines', () => {
  const ppl = [{ id: 'h', name: 'Gabriel Leubitz', email: 'g@x.co' }, { id: 'i', name: 'Ilan Leubitz', email: 'i@x.co' }]
  it('routes [Name] lines to that user and drops footer boilerplate', () => {
    const r = classifyActions(['[Ilan Leubitz] Run ads: trial', '[ariel tzadok] Send email', '[The group] Do thing', 'Want to see more? View the full notes'], ppl, 'h')
    expect(r.tasks).toEqual([{ assigneeId: 'i', title: 'Run ads: trial' }])
    expect(r.followUps.map((f) => f.who)).toEqual(['ariel tzadok', 'The group'])
  })
})
