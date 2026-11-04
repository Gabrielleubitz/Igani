import { describe, expect, it } from 'vitest'
import { CALL_STATUSES, EARLY_STATUSES, OUTCOME_STATUS, callBlockedByOwner, statusAfterCall } from '@/lib/call-status'
import { SALES_STAGES, canSetStage } from '@/lib/stage-rules'

describe('call result becomes the lead status', () => {
  it('maps every wrap-up outcome', () => {
    expect(OUTCOME_STATUS).toEqual({ connected: 'CONTACTED', interested: 'INTERESTED', callback: 'CALL_BACK', no_answer: 'NO_ANSWER', voicemail: 'VOICEMAIL', busy: 'BUSY', not_interested: 'NOT_INTERESTED', wrong_number: 'WRONG_NUMBER' })
    expect(statusAfterCall('NEW', 'callback')).toBe('CALL_BACK')
    expect(statusAfterCall('CALL_BACK', 'interested')).toBe('INTERESTED')
    expect(statusAfterCall('NO_ANSWER', 'connected')).toBe('CONTACTED')
  })
  it('does nothing when the status would not change or the outcome is unknown', () => {
    expect(statusAfterCall('BUSY', 'busy')).toBeNull()
    expect(statusAfterCall('NEW', 'other')).toBeNull()
  })
  it('never pulls a lead back out of the deal stages', () => {
    for (const s of ['DEMO_SCHEDULED', 'DEMO_SENT', 'PROPOSAL_SENT', 'SIGNED', 'WON', 'LOST'] as const) expect(statusAfterCall(s, 'no_answer')).toBeNull()
  })
  it('covers the early stages and lets salespeople set the call statuses', () => {
    expect(EARLY_STATUSES).toEqual(['NEW', ...CALL_STATUSES, 'CONTACTED'])
    for (const s of CALL_STATUSES) {
      expect(SALES_STAGES).toContain(s)
      expect(canSetStage('SALES', s)).toBe(true)
    }
    expect(canSetStage('SALES', 'WON')).toBe(false)
  })
})

describe('calling a number that is already a lead', () => {
  it('blocks a salesperson when someone else owns the lead', () => {
    expect(callBlockedByOwner({ assignedToId: 'other' }, { id: 'me', role: 'SALES' })).toBe(true)
  })
  it('allows own, unassigned and admin calls', () => {
    expect(callBlockedByOwner({ assignedToId: 'me' }, { id: 'me', role: 'SALES' })).toBe(false)
    expect(callBlockedByOwner({ assignedToId: null }, { id: 'me', role: 'SALES' })).toBe(false)
    expect(callBlockedByOwner({ assignedToId: 'other' }, { id: 'admin', role: 'ADMIN' })).toBe(false)
  })
})
