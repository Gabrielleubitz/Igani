import { describe, expect, it } from 'vitest'
import { buildTimeline, filterTimeline, groupTimeline, kindOfAction, type DescribeCtx, type LogLike } from '@/lib/lead-timeline'

const ctx: DescribeCtx = { isAdmin: false, tz: 'Asia/Jerusalem', nameOf: new Map([['u1', 'Rita']]), titles: new Map([['t1', 'Send proposal']]) }
const log = (id: string, action: string, at: string, metadata: Record<string, unknown> = {}, actor: LogLike['actor'] = { name: 'Rita', email: null }): LogLike => ({ id, action, metadata, createdAt: new Date(at), actor })
const now = new Date('2026-11-12T12:00:00Z')

describe('lead timeline', () => {
  it('types each action', () => {
    expect(kindOfAction('note.added')).toBe('note')
    expect(kindOfAction('email.received')).toBe('email')
    expect(kindOfAction('sms.sent')).toBe('sms')
    expect(kindOfAction('call.analyzed')).toBe('call')
    expect(kindOfAction('touch.logged', { kind: 'meeting' })).toBe('meeting')
    expect(kindOfAction('task.completed')).toBe('task')
    expect(kindOfAction('lead.status_changed')).toBe('lead')
  })

  it('merges the log with open tasks and future meetings, newest first, and hides reminders', () => {
    const items = buildTimeline({
      now,
      me: 'u1',
      ctx,
      logs: [log('a', 'note.added', '2026-11-10T09:00:00Z', { body: 'Hello' }), log('b', 'task.reminded', '2026-11-11T09:00:00Z'), log('c', 'email.received', '2026-11-11T10:00:00Z', { from: 'dana@x.co', subject: 'Hi', body: 'Thanks' }, null)],
      tasks: [
        { id: 't1', title: 'Send proposal', dueAt: new Date('2026-11-11T08:00:00Z'), done: false },
        { id: 't2', title: 'Call back', dueAt: new Date('2026-11-15T08:00:00Z'), done: false },
        { id: 't3', title: 'Done already', dueAt: null, done: true },
      ],
      bookings: [
        { id: 'b1', title: 'Demo', startTime: new Date('2026-11-14T10:00:00Z'), endTime: new Date('2026-11-14T10:30:00Z'), status: 'CONFIRMED', hostName: 'Rita' },
        { id: 'b2', title: 'Old', startTime: new Date('2026-11-01T10:00:00Z'), endTime: new Date('2026-11-01T10:30:00Z'), status: 'CONFIRMED', hostName: 'Rita' },
        { id: 'b3', title: 'Cancelled', startTime: new Date('2026-11-16T10:00:00Z'), endTime: new Date('2026-11-16T10:30:00Z'), status: 'CANCELLED', hostName: 'Rita' },
      ],
    })
    expect(items.map((i) => i.id)).toEqual(['task:t2', 'booking:b1', 'c', 'task:t1', 'a'].sort((x, y) => items.findIndex((i) => i.id === y) - items.findIndex((i) => i.id === x)).reverse())
    expect(items.find((i) => i.id === 'task:t1')!.group).toBe('overdue')
    expect(items.find((i) => i.id === 'task:t2')!.group).toBe('upcoming')
    expect(items.find((i) => i.id === 'c')).toMatchObject({ kind: 'email', dir: 'in', actor: 'System' })
    expect(items.some((i) => i.id === 'b' || i.id === 'task:t3' || i.id === 'booking:b2' || i.id === 'booking:b3')).toBe(false)
  })

  it('groups into Overdue, Upcoming and months', () => {
    const items = buildTimeline({
      now,
      me: 'u1',
      ctx,
      logs: [log('a', 'note.added', '2026-11-10T09:00:00Z', { body: 'x' }), log('d', 'note.added', '2026-10-02T09:00:00Z', { body: 'y' })],
      tasks: [{ id: 't1', title: 'Late', dueAt: new Date('2026-11-01T08:00:00Z'), done: false }],
      bookings: [],
    })
    expect(groupTimeline(items, 'Asia/Jerusalem').map((s) => s.label)).toEqual(['Overdue', 'November 2026', 'October 2026'])
  })

  it('filters by type and searches title, text and who', () => {
    const items = buildTimeline({ now, me: 'u1', ctx, logs: [log('a', 'note.added', '2026-11-10T09:00:00Z', { body: 'Wants a quote' }), log('c', 'email.sent', '2026-11-11T10:00:00Z', { subject: 'Proposal', body: 'See attached' })], tasks: [], bookings: [] })
    expect(filterTimeline(items, 'note', '').map((i) => i.id)).toEqual(['a'])
    expect(filterTimeline(items, 'all', 'attached').map((i) => i.id)).toEqual(['c'])
    expect(filterTimeline(items, 'all', 'RITA')).toHaveLength(2)
  })

  it('keeps money out of the wording for a salesperson', () => {
    const items = buildTimeline({ now, me: 'u1', ctx, logs: [log('s', 'lead.status_changed', '2026-11-10T09:00:00Z', { from: 'NEW', to: 'PROPOSAL_SENT', quotedPrice: 9000 })], tasks: [], bookings: [] })
    expect(items[0]!.body ?? '').not.toMatch(/9,?000|Quoted/)
    const admin = buildTimeline({ now, me: 'u1', ctx: { ...ctx, isAdmin: true }, logs: [log('s', 'lead.status_changed', '2026-11-10T09:00:00Z', { from: 'NEW', to: 'PROPOSAL_SENT', quotedPrice: 9000 })], tasks: [], bookings: [] })
    expect(admin[0]!.body).toMatch(/Quoted price/)
  })
})
