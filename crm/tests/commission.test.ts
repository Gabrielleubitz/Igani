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

  it('splits into a 30% downpayment and a 70% final milestone that add up exactly', () => {
    expect(calculateCommission(25_000)).toMatchObject({ total: 6_500, downpayment: 1_950, final: 4_550 })
    for (const deal of [1, 777, 12_345, 18_001, 33_333]) {
      const c = calculateCommission(deal)
      expect(c.downpayment + c.final).toBe(c.total)
    }
  })

  it('rounds to whole shekels', () => {
    expect(calculateCommission(333).total).toBe(100) // 99.9
    expect(Number.isInteger(calculateCommission(12_345.67).total)).toBe(true)
  })

  it('uses custom terms, and copes with nonsense', () => {
    const t = { baseRatePct: 20, threshold: 10_000, incrementSize: 2_000, bonusPerIncrement: 500, downpaymentSharePct: 50 }
    expect(calculateCommission(15_000, t)).toMatchObject({ total: 2_000 + 1_000, downpayment: 1_500, final: 1_500 })
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
  const base = { commissionTotal: 6_500, commissionDownpayment: 1_950, commissionFinal: 4_550, downpaymentReceivedAt: null, finalPaymentReceivedAt: null, downpaymentPaidAt: null, finalPaidAt: null }
  const d = new Date('2026-11-03')
  it('starts fully pending', () => expect(commissionStatus(base)).toEqual({ total: 6_500, paid: 0, payable: 0, pending: 6_500 }))
  it('downpayment received makes only that part payable', () => expect(commissionStatus({ ...base, downpaymentReceivedAt: d })).toEqual({ total: 6_500, paid: 0, payable: 1_950, pending: 4_550 }))
  it('then paid out', () => expect(commissionStatus({ ...base, downpaymentReceivedAt: d, downpaymentPaidAt: d })).toEqual({ total: 6_500, paid: 1_950, payable: 0, pending: 4_550 }))
  it('a payout date without the client money does not count', () => expect(commissionStatus({ ...base, downpaymentPaidAt: d })).toEqual({ total: 6_500, paid: 0, payable: 0, pending: 6_500 }))
  it('everything collected and paid', () => expect(commissionStatus({ ...base, downpaymentReceivedAt: d, finalPaymentReceivedAt: d, downpaymentPaidAt: d, finalPaidAt: d })).toEqual({ total: 6_500, paid: 6_500, payable: 0, pending: 0 }))

  it('the salesperson view carries only the total, paid and pending amounts', () => {
    const view = salespersonCommissionView(commissionStatus({ ...base, downpaymentReceivedAt: d, downpaymentPaidAt: d }))
    expect(view).toEqual({ total: 6_500, paid: 1_950, pending: 4_550 })
    expect(Object.keys(view).sort()).toEqual(['paid', 'pending', 'total'])
  })
})
