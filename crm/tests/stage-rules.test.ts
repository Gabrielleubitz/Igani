import { describe, expect, it, vi } from 'vitest'
import { canEditAtStage, canSetStage, stageChangeProblem, stagesFor } from '../lib/stage-rules'

const ALL7 = ['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'DEMO_SENT', 'PROPOSAL_SENT', 'SIGNED', 'WON', 'LOST'] as const

describe('pipeline permissions', () => {
  it('admins can do everything', () => {
    for (const s of ALL7) {
      expect(canSetStage('ADMIN', s)).toBe(true)
      expect(canEditAtStage('ADMIN', s)).toBe(true)
    }
    expect(stagesFor('ADMIN', ALL7)).toEqual(ALL7)
  })

  it('salespeople work New, Contacted and Demo scheduled, and can move back and forth between them', () => {
    expect(stagesFor('SALES', ALL7)).toEqual(['NEW', 'CONTACTED', 'DEMO_SCHEDULED'])
    expect(stageChangeProblem('SALES', 'NEW', 'DEMO_SCHEDULED')).toBeNull()
    expect(stageChangeProblem('SALES', 'DEMO_SCHEDULED', 'CONTACTED')).toBeNull() // back down is fine
    expect(stageChangeProblem('SALES', 'DEMO_SCHEDULED', 'NEW')).toBeNull()
  })

  it('they cannot move a lead into Demo sent, Proposal sent, Won or Lost', () => {
    for (const to of ['DEMO_SENT', 'PROPOSAL_SENT', 'WON', 'LOST'] as const) expect(stageChangeProblem('SALES', 'CONTACTED', to)).toMatch(/Only an admin/)
  })

  it('once an admin has set Demo sent / Proposal sent / Won / Lost, the stage is theirs no more', () => {
    for (const from of ['DEMO_SENT', 'PROPOSAL_SENT', 'WON', 'LOST'] as const) {
      expect(canEditAtStage('SALES', from)).toBe(false)
      expect(stageChangeProblem('SALES', from, 'NEW')).toMatch(/Only an admin/)
      expect(stageChangeProblem('MARKETING', from, 'CONTACTED')).toMatch(/Only an admin/)
      expect(stageChangeProblem('ADMIN', from, 'NEW')).toBeNull()
    }
  })
})

describe('a database that is missing a migration', () => {
  it('is reported plainly instead of a vague failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { toActionError } = await import('../app/actions/result')
    const enumError = new Error('Invalid `prisma.lead.update()` invocation: invalid input value for enum "LeadStatus": "DEMO_SENT"')
    expect(toActionError(enumError)).toEqual({ ok: false, error: expect.stringMatching(/database has not been updated/i) })
    expect(toActionError(Object.assign(new Error('boom'), { code: 'P2034' })).error).toMatch(/P2034/)
    expect(toActionError(new Error('boom')).error).toBe('Something went wrong. Please try again.')
  })
})
