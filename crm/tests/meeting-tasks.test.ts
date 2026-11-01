import { describe, expect, it } from 'vitest'
import { matchPerson, planMeetingTasks, splitAction } from '@/lib/meeting-tasks'

const people = [
  { id: 'u1', name: 'Dana Cohen', email: 'dana@igani.co' },
  { id: 'u2', name: 'Gabriel Leubitz', email: 'gabriel@igani.co' },
  { id: 'u3', name: 'Dana Levi', email: 'dl@igani.co' },
]

describe('meeting action items -> tasks', () => {
  it('splits "Who: task"', () => {
    expect(splitAction('Gabriel: send the proposal')).toEqual({ who: 'Gabriel', title: 'send the proposal' })
    expect(splitAction('Send the proposal')).toEqual({ who: null, title: 'Send the proposal' })
    expect(splitAction('Note that the plan is: wait').who).toBeNull()
  })
  it('matches by first name or email prefix, not when ambiguous', () => {
    expect(matchPerson('Gabriel', people)?.id).toBe('u2')
    expect(matchPerson('dl', people)?.id).toBe('u3')
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
