import { describe, expect, it } from 'vitest'
import { addBusinessDays, groupPayouts, monthKey, payoutDueDate, type PayoutRow } from '../lib/payouts'

const d = (s: string): Date => new Date(`${s}T00:00:00Z`)
const row = (o: Partial<PayoutRow>): PayoutRow => ({ leadId: 'l', lead: 'Deal', salesperson: 'Ariel', email: 'a@b.co', amount: 1000, receivedAt: d('2026-11-10'), paidAt: null, refundedAt: null, payoutDays: 10, clawbackDays: 60, ...o })

describe('business days (Sunday to Thursday)', () => {
  it('skips Friday and Saturday', () => {
    expect(addBusinessDays(d('2026-11-05'), 1).toISOString().slice(0, 10)).toBe('2026-11-08') // Thu → Sun
    expect(addBusinessDays(d('2026-11-30'), 10).toISOString().slice(0, 10)).toBe('2026-12-14') // Mon → Mon, two weeks
    expect(addBusinessDays(d('2026-11-30'), 0).toISOString().slice(0, 10)).toBe('2026-11-30')
  })
  it('puts the due date after the month end, or none without an agreement', () => {
    expect(payoutDueDate('2026-11', 10)?.toISOString().slice(0, 10)).toBe('2026-12-14')
    expect(payoutDueDate('2026-11', null)).toBeNull()
  })
  it('uses the Israel calendar month', () => {
    expect(monthKey(new Date('2026-11-30T23:30:00Z'))).toBe('2026-12') // already Dec 1 in Israel
  })
})

describe('grouping', () => {
  it('groups payable deals by the month the client paid and lists clawbacks apart', () => {
    const g = groupPayouts([
      row({ leadId: 'a', receivedAt: d('2026-11-10') }),
      row({ leadId: 'b', receivedAt: d('2026-11-20'), amount: 500 }),
      row({ leadId: 'c', receivedAt: d('2026-12-02') }),
      row({ leadId: 'd', receivedAt: null }), // client has not paid
      row({ leadId: 'e', paidAt: d('2026-12-01') }), // already paid
      row({ leadId: 'f', paidAt: d('2026-12-01'), refundedAt: d('2026-12-20') }), // within 60 days
      row({ leadId: 'g', paidAt: d('2026-12-01'), refundedAt: d('2027-03-01'), receivedAt: d('2026-11-10') }), // outside
      row({ leadId: 'h', refundedAt: d('2026-12-20') }), // refunded before payout: cancelled, not payable
    ])
    expect(g.months.map((m) => [m.month, m.rows.length, m.total])).toEqual([['2026-11', 2, 1500], ['2026-12', 1, 1000]])
    expect(g.clawbacks.map((c) => [c.row.leadId, c.withinWindow])).toEqual([['f', true], ['g', false]])
  })
  it('does not guess a due date without a signed agreement', () => {
    expect(groupPayouts([row({ payoutDays: null, clawbackDays: null })]).months[0]?.dueDate).toBeNull()
  })
})
