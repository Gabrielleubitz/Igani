import { describe, expect, it } from 'vitest'
import { buildReport, csvCell, filterLeads, foldTasks, leadScore, scoreLabel, staleDays, toCsv } from '@/components/crm/crm-utils'

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

import { csvToLeadRows, parseCsv, splitDue } from '@/components/crm/crm-utils'

describe('csv import', () => {
  it('parses quoted cells and maps headers', () => {
    const rows = parseCsv('Email,First Name,Company,Message\r\nA@X.com,Ann,"Acme, Inc","say ""hi""\nline2"\n\nbad,Bob,,\na@x.com,Dup,,\n')
    expect(rows[1]?.[2]).toBe('Acme, Inc')
    const { leads, errors } = csvToLeadRows(rows)
    expect(leads).toEqual([{ email: 'a@x.com', firstName: 'Ann', company: 'Acme, Inc', message: 'say "hi"\nline2' }])
    expect(errors.map((e) => e.reason)).toEqual(['Invalid email "bad"', 'Duplicate of an earlier row (a@x.com)'])
  })
  it('requires an email column', () => {
    expect(csvToLeadRows(parseCsv('name\nx')).errors[0]?.reason).toMatch(/email/)
  })
})

describe('splitDue', () => {
  it('splits overdue and due today', () => {
    const now = new Date('2026-05-10T12:00:00Z')
    const mk = (id: string, dueAt: string | null, done = false) => ({ id, leadId: 'l', title: id, dueAt: dueAt ? new Date(dueAt) : null, assigneeId: 'u', done, priority: 'MEDIUM' as const })
    const r = splitDue([mk('a', '2026-05-09T00:00:00Z'), mk('b', '2026-05-10T20:00:00Z'), mk('c', '2026-05-11T01:00:00Z'), mk('d', null), mk('e', '2026-05-01T00:00:00Z', true)], now)
    expect(r.overdue.map((t) => t.id)).toEqual(['a'])
    expect(r.today.map((t) => t.id)).toEqual(['b'])
  })
})

describe('leadScore / staleDays', () => {
  const lead = { status: 'PROPOSAL_SENT', email: 'a@acme.com', phone: '1', company: 'Acme', website: null, budget: '10k', message: 'hi', dealValue: 5000 }
  it('scores qualified leads hot and closed leads zero', () => {
    expect(scoreLabel(leadScore(lead))).toBe('Hot')
    expect(leadScore({ ...lead, status: 'WON' })).toBe(0)
    expect(scoreLabel(leadScore({ ...lead, status: 'NEW', email: 'a@gmail.com', phone: null, company: null, budget: null, message: null, dealValue: null }))).toBe('Cold')
  })
  it('flags only open leads quiet for a week', () => {
    const now = new Date('2026-03-31T00:00:00Z')
    expect(staleDays('NEW', new Date('2026-03-20T00:00:00Z'), now)).toBe(11)
    expect(staleDays('NEW', new Date('2026-03-30T00:00:00Z'), now)).toBeNull()
    expect(staleDays('LOST', new Date('2026-01-01T00:00:00Z'), now)).toBeNull()
  })
})
