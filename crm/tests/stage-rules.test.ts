import { describe, expect, it } from 'vitest'
import { canEditAtStage, canEditValueAtStage, canSetStage, stageChangeProblem, stagesFor } from '../lib/stage-rules'

const ALL = ['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'PROPOSAL_SENT', 'WON', 'LOST'] as const

describe('pipeline permissions', () => {
  it('admins can do everything', () => {
    for (const s of ALL) {
      expect(canSetStage('ADMIN', s)).toBe(true)
      expect(canEditAtStage('ADMIN', s)).toBe(true)
    }
    expect(stagesFor('ADMIN', ALL)).toEqual(ALL)
  })

  it('salespeople can only move leads up to Demo scheduled', () => {
    expect(stagesFor('SALES', ALL)).toEqual(['NEW', 'CONTACTED', 'DEMO_SCHEDULED'])
    expect(stageChangeProblem('SALES', 'NEW', 'DEMO_SCHEDULED')).toBeNull()
    expect(stageChangeProblem('SALES', 'NEW', 'CONTACTED')).toBeNull()
    expect(stageChangeProblem('SALES', 'CONTACTED', 'NEW')).toBeNull()
    for (const to of ['PROPOSAL_SENT', 'WON', 'LOST'] as const) expect(stageChangeProblem('SALES', 'CONTACTED', to)).toMatch(/Only an admin/)
  })

  it('the moment a lead reaches Demo scheduled, its stage is locked for them', () => {
    expect(stageChangeProblem('SALES', 'CONTACTED', 'DEMO_SCHEDULED')).toBeNull() // they can take it there...
    for (const from of ['DEMO_SCHEDULED', 'PROPOSAL_SENT', 'WON', 'LOST'] as const) {
      expect(canEditAtStage('SALES', from)).toBe(false) // ...but not move it again
      expect(stageChangeProblem('SALES', from, 'NEW')).toMatch(/only an admin/i)
      expect(stageChangeProblem('MARKETING', from, 'CONTACTED')).toMatch(/only an admin/i)
      expect(stageChangeProblem('ADMIN', from, 'NEW')).toBeNull()
    }
  })

  it('the deal value stays editable up to Demo scheduled, then is the admins', () => {
    for (const at of ['NEW', 'CONTACTED', 'DEMO_SCHEDULED'] as const) expect(canEditValueAtStage('SALES', at)).toBe(true)
    for (const at of ['PROPOSAL_SENT', 'WON', 'LOST'] as const) expect(canEditValueAtStage('SALES', at)).toBe(false)
    expect(canEditValueAtStage('ADMIN', 'WON')).toBe(true)
  })
})
