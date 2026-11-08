import { describe, expect, it } from 'vitest'
import { reassignProblem, type Sourcer } from '../lib/lead-protection'

const ann: Sourcer = { name: 'Ann', active: true, terminatedAt: null }

describe('a lead the salesperson sourced stays theirs', () => {
  it('refuses to give it to anyone else, or to unassign it', () => {
    expect(reassignProblem({ sourcedById: 'ann', assignedToId: 'ann' }, 'bo', ann)).toMatch(/sourced by Ann.*stays theirs/)
    expect(reassignProblem({ sourcedById: 'ann', assignedToId: 'ann' }, null, ann)).not.toBeNull()
  })
  it('allows keeping it with the same person', () => {
    expect(reassignProblem({ sourcedById: 'ann', assignedToId: 'ann' }, 'ann', ann)).toBeNull()
  })
  it('leaves leads nobody sourced (website, ads, bookings) free to move', () => {
    expect(reassignProblem({ sourcedById: null, assignedToId: 'ann' }, 'bo', null)).toBeNull()
  })
  it('frees the lead when the sourcer has left, was removed or is no longer active', () => {
    expect(reassignProblem({ sourcedById: 'ann', assignedToId: 'ann' }, 'bo', { ...ann, terminatedAt: new Date('2026-12-01') })).toBeNull()
    expect(reassignProblem({ sourcedById: 'ann', assignedToId: 'ann' }, 'bo', { ...ann, active: false })).toBeNull()
    expect(reassignProblem({ sourcedById: 'ann', assignedToId: 'ann' }, 'bo', null)).toBeNull()
  })
})
