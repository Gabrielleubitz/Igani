import { describe, expect, it } from 'vitest'
import { buildReport, csvCell, filterLeads, foldTasks, toCsv } from '@/components/crm/crm-utils'

describe('csv', () => {
  it('quotes and neutralises formulas', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(csvCell(null)).toBe('')
    expect(toCsv(['a', 'b'], [[1, 'x']])).toBe('a,b\r\n1,x\r\n')
  })
})

describe('foldTasks', () => {
  const t = (s: number): Date => new Date(2026, 0, 1, 0, 0, s)
  it('marks completed tasks', () => {
    const tasks = foldTasks([
      { entityId: 'l1', action: 'task.completed', createdAt: t(2), metadata: { taskId: 'a' } },
      { entityId: 'l1', action: 'task.created', createdAt: t(1), metadata: { taskId: 'a', title: 'Call', dueAt: '2026-02-01T00:00:00.000Z', assigneeId: 'u1' } },
      { entityId: 'l2', action: 'task.created', createdAt: t(3), metadata: { taskId: 'b', title: 'Mail' } },
    ])
    expect(tasks.find((x) => x.id === 'a')?.done).toBe(true)
    expect(tasks.find((x) => x.id === 'b')).toMatchObject({ done: false, dueAt: null, leadId: 'l2' })
  })
})

describe('filterLeads / buildReport', () => {
  const base = { firstName: null, lastName: null, company: null, phone: null, source: 'igani.co', assignedToId: null }
  const leads = [
    { ...base, email: 'a@x.com', company: 'Acme', status: 'NEW' },
    { ...base, email: 'b@y.com', status: 'WON', assignedToId: 'u1', source: 'ads' },
    { ...base, email: 'c@y.com', status: 'LOST', assignedToId: 'u1' },
  ]
  it('filters', () => {
    expect(filterLeads(leads, { q: 'acme' })).toHaveLength(1)
    expect(filterLeads(leads, { owner: 'none' })).toHaveLength(1)
    expect(filterLeads(leads, { owner: 'u1', status: 'WON' })).toHaveLength(1)
  })
  it('reports', () => {
    const now = new Date('2026-03-31T12:00:00Z')
    const r = buildReport(
      leads.map((l) => ({ ...l, status: l.status as 'NEW', createdAt: now })),
      (id) => id ?? 'none',
      now,
    )
    expect(r.total).toBe(3)
    expect(r.winRate).toBe(0.5)
    expect(r.perDay).toHaveLength(30)
    expect(r.perDay.at(-1)?.count).toBe(3)
  })
})
