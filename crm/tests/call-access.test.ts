import { describe, expect, it } from 'vitest'
import { callRelation } from '@/lib/call-access'

describe('who may open a call', () => {
  const call = { userId: 'rep1' }
  it('admins see every call', () => expect(callRelation({ id: 'a', role: 'ADMIN' }, call, [])).toBe('admin'))
  it('the caller sees his own', () => expect(callRelation({ id: 'rep1', role: 'SALES' }, call, [])).toBe('owner'))
  it('a salesman added to the call sees it, as shared', () => expect(callRelation({ id: 'rep2', role: 'SALES' }, call, ['rep2'])).toBe('shared'))
  it('another salesman does not', () => expect(callRelation({ id: 'rep3', role: 'SALES' }, call, ['rep2'])).toBeNull())
  it('a call with no owner is not anyone’s by accident', () => expect(callRelation({ id: 'rep3', role: 'SALES' }, { userId: null }, [])).toBeNull())
})
