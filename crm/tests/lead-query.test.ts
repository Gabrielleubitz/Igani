import { describe, expect, it } from 'vitest'
import { buildLeadWhere, conversionRate, parseLeadFilters, toCsv } from '@/lib/lead-query'

describe('lead filters', () => {
  it('parses and sanitises params', () => {
    const f = parseLeadFilters({ q: ' acme ', status: 'BOGUS', page: '-3', assignee: 'none' })
    expect(f).toMatchObject({ q: 'acme', status: undefined, page: 1, assignee: 'none', archived: false })
    expect(parseLeadFilters({ status: 'WON', page: '4', archived: '1' })).toMatchObject({ status: 'WON', page: 4, archived: true })
  })
  it('builds where clause', () => {
    const w = buildLeadWhere(parseLeadFilters({ q: 'x', assignee: 'none', status: 'NEW' }))
    expect(JSON.stringify(w)).toContain('"assignedToId":null')
    expect(JSON.stringify(w)).toContain('"archived":false')
    expect(JSON.stringify(w)).toContain('"status":"NEW"')
  })
  it('filters by tag', () => {
    expect(JSON.stringify(buildLeadWhere(parseLeadFilters({ tag: ' VIP ' })))).toContain('"tags":{"has":"vip"}')
  })
  it('computes conversion', () => {
    expect(conversionRate(1, 3)).toBe(33.3)
    expect(conversionRate(0, 0)).toBe(0)
  })
  it('escapes csv and neutralises formulas', () => {
    expect(toCsv(['a', 'b'], [['=cmd()', 'x,"y"']])).toBe('a,b\r\n\'=cmd(),"x,""y"""')
  })
})
