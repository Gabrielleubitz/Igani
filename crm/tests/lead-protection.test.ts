import { describe, expect, it } from 'vitest'
import { reassignProblem, type Person } from '../lib/lead-protection'

const ann: Person = { name: 'Ann', active: true, terminatedAt: null }
const lead = (o: Partial<{ sourcedById: string | null; assignedToId: string | null; status: string }>) => ({ sourcedById: null, assignedToId: 'ann', status: 'CONTACTED', ...o })

describe('leads a salesperson sourced', () => {
  it('stay theirs: no one else, no unassigning', () => {
    expect(reassignProblem(lead({ sourcedById: 'ann' }), 'bo', ann, ann)).toMatch(/sourced by Ann.*stays theirs/)
    expect(reassignProblem(lead({ sourcedById: 'ann' }), null, ann, ann)).not.toBeNull()
    expect(reassignProblem(lead({ sourcedById: 'ann' }), 'ann', ann, ann)).toBeNull()
  })
  it('stay theirs at every stage, not only once closed', () => {
    for (const status of ['NEW', 'CONTACTED', 'PROPOSAL_SENT', 'SIGNED', 'WON']) expect(reassignProblem(lead({ sourcedById: 'ann', status }), 'bo', ann, ann)).not.toBeNull()
  })
})

describe('leads the company gave a salesperson', () => {
  it('can be moved until they close', () => {
    for (const status of ['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'PROPOSAL_SENT', 'LOST']) expect(reassignProblem(lead({ status }), 'bo', null, ann)).toBeNull()
  })
  it('cannot be touched from the moment the client signs', () => {
    expect(reassignProblem(lead({ status: 'SIGNED' }), 'bo', null, ann)).toMatch(/Ann closed this deal/)
    expect(reassignProblem(lead({ status: 'WON' }), 'bo', null, ann)).toMatch(/stays theirs/)
    expect(reassignProblem(lead({ status: 'WON' }), null, null, ann)).not.toBeNull()
    expect(reassignProblem(lead({ status: 'WON' }), 'ann', null, ann)).toBeNull()
  })
})

describe('other leads and departed salespeople', () => {
  it('leaves an unassigned inbound lead free', () => {
    expect(reassignProblem(lead({ assignedToId: null, status: 'NEW' }), 'bo', null, null)).toBeNull()
  })
  it('frees a lead when the salesperson has left, was removed or is inactive', () => {
    const left = { ...ann, terminatedAt: new Date('2026-12-01') }
    expect(reassignProblem(lead({ sourcedById: 'ann' }), 'bo', left, left)).toBeNull()
    expect(reassignProblem(lead({ status: 'WON' }), 'bo', null, { ...ann, active: false })).toBeNull()
    expect(reassignProblem(lead({ sourcedById: 'ann', status: 'WON' }), 'bo', null, null)).toBeNull()
  })
})
