import { describe, expect, it } from 'vitest'
import { DEFAULT_COMMISSION_TERMS, calculateCommission, commissionStatus, dealTerms, parseTerms, salespersonCommissionView } from '../lib/commission'

describe('calculateCommission (default terms: 30%, ₪15,000 threshold, ₪5,000 increments, ₪1,000 bonus)', () => {
  it.each([
    [10_000, 3_000],
    [15_000, 4_500],
    [19_999, 4_500], // no completed increment yet
    [20_000, 5_500],
    [25_000, 6_500],
    [30_000, 7_500],
  ])('a ₪%i deal earns ₪%i', (deal, expected) => {
    expect(calculateCommission(deal).total).toBe(expected)
  })

  it('shows the breakdown', () => {
    expect(calculateCommission(25_000)).toMatchObject({ baseAmount: 15_000, baseCommission: 4_500, completedIncrements: 2, bonusTotal: 2_000, total: 6_500 })
    expect(calculateCommission(10_000)).toMatchObject({ baseAmount: 10_000, completedIncrements: 0, bonusTotal: 0 })
  })

  it('has no downpayment split: one total', () => {
    expect(Object.keys(calculateCommission(25_000)).sort()).toEqual(['amount', 'baseAmount', 'baseCommission', 'bonusTotal', 'completedIncrements', 'total'])
  })

  it('never pays more than the deal itself, and always fits the database column', () => {
    const silly = { baseRatePct: 100, threshold: 1, incrementSize: 1, bonusPerIncrement: 1_000_000_000, downpaymentSharePct: 30 } as never
    const c = calculateCommission(5_000_000, silly)
    expect(c.total).toBeLessThanOrEqual(5_000_000)
    expect(c.total).toBeLessThanOrEqual(2_000_000_000)
  })

  it('rounds to whole shekels', () => {
    expect(calculateCommission(333).total).toBe(100) // 99.9
    expect(Number.isInteger(calculateCommission(12_345.67).total)).toBe(true)
  })

  it('uses custom terms, and copes with nonsense', () => {
    const t = { baseRatePct: 20, threshold: 10_000, incrementSize: 2_000, bonusPerIncrement: 500 }
    expect(calculateCommission(15_000, t)).toMatchObject({ total: 2_000 + 1_000 })
    expect(calculateCommission(0).total).toBe(0)
    expect(calculateCommission(-5).total).toBe(0)
    expect(calculateCommission(50_000, { ...DEFAULT_COMMISSION_TERMS, incrementSize: 0 }).total).toBe(4_500) // no division by zero
  })
})

describe('terms', () => {
  it('fall back to the defaults, and per-deal overrides win without touching the saved terms', () => {
    expect(parseTerms(null)).toEqual(DEFAULT_COMMISSION_TERMS)
    expect(parseTerms({ baseRatePct: 'x', threshold: -1 })).toEqual(DEFAULT_COMMISSION_TERMS)
    const saved = { baseRatePct: 25, threshold: 12_000 }
    expect(dealTerms(saved, null)).toMatchObject({ baseRatePct: 25, threshold: 12_000, incrementSize: 5_000 })
    expect(dealTerms(saved, { baseRatePct: 40 })).toMatchObject({ baseRatePct: 40, threshold: 12_000 })
    expect(saved).toEqual({ baseRatePct: 25, threshold: 12_000 })
  })
})

describe('commission status: nothing is payable before the client pays', () => {
  const base = { commissionTotal: 6_500, finalPaymentReceivedAt: null, finalPaidAt: null }
  const d = new Date('2026-11-03')
  it('starts fully pending', () => expect(commissionStatus(base)).toEqual({ total: 6_500, paid: 0, payable: 0, pending: 6_500 }))
  it('the client paying makes all of it payable', () => expect(commissionStatus({ ...base, finalPaymentReceivedAt: d })).toEqual({ total: 6_500, paid: 0, payable: 6_500, pending: 0 }))
  it('then paid out', () => expect(commissionStatus({ ...base, finalPaymentReceivedAt: d, finalPaidAt: d })).toEqual({ total: 6_500, paid: 6_500, payable: 0, pending: 0 }))
  it('a payout date without the client money does not count', () => expect(commissionStatus({ ...base, finalPaidAt: d })).toEqual({ total: 6_500, paid: 0, payable: 0, pending: 6_500 }))

  it('the salesperson view carries only the total, paid and pending amounts', () => {
    const view = salespersonCommissionView(commissionStatus({ ...base, finalPaymentReceivedAt: d }))
    expect(view).toEqual({ total: 6_500, paid: 0, pending: 6_500 })
    expect(Object.keys(view).sort()).toEqual(['paid', 'pending', 'total'])
  })
})
