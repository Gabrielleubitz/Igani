import { describe, expect, it } from 'vitest'
import { canEditAtStage, canSetStage, stageChangeProblem, stagesFor } from '../lib/stage-rules'

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
    expect(stageChangeProblem('SALES', 'DEMO_SCHEDULED', 'CONTACTED')).toBeNull()
    for (const to of ['PROPOSAL_SENT', 'WON', 'LOST'] as const) expect(stageChangeProblem('SALES', 'CONTACTED', to)).toMatch(/Only an admin/)
  })

  it('a lead already past Demo scheduled is locked for them, whatever the target', () => {
    for (const from of ['PROPOSAL_SENT', 'WON', 'LOST'] as const) {
      expect(canEditAtStage('SALES', from)).toBe(false)
      expect(stageChangeProblem('SALES', from, 'NEW')).toMatch(/already at/)
      expect(stageChangeProblem('MARKETING', from, 'DEMO_SCHEDULED')).toMatch(/already at/)
    }
  })
})
