import { describe, expect, it } from 'vitest'
import { visibleLeadsWhere } from '../components/crm/crm-utils'

describe('who sees which leads', () => {
  it('admins see every lead', () => {
    expect(visibleLeadsWhere('ADMIN', 'a1')).toEqual({})
  })

  it('everyone else sees only the leads assigned to them (not unassigned ones either)', () => {
    expect(visibleLeadsWhere('SALES', 's1')).toEqual({ assignedToId: 's1' })
    expect(visibleLeadsWhere('MARKETING', 'm1')).toEqual({ assignedToId: 'm1' })
  })
})
