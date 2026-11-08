import { describe, expect, it } from 'vitest'
import { DEFAULT_COMMISSION_TERMS, calculateCommission, commissionStatus, dealTerms, parseTerms, salespersonCommissionView } from '../lib/commission'

describe('calculateCommission (30% of every payment; bonus at the end: ₪1,000 per ₪5,000 above ₪15,000)', () => {
  it.each([
    [10_000, 3_000],
    [15_000, 4_500],
    [19_999, 6_000], // 30% of the whole price, no completed increment yet so no bonus
    [20_000, 7_000], // 6,000 + one ₪1,000 bonus
    [25_000, 9_500], // 7,500 + 2,000
    [30_000, 12_000], // 9,000 + 3,000
  ])('a ₪%i deal earns ₪%i', (deal, expected) => {
    expect(calculateCommission(deal).total).toBe(expected)
  })

  it('shows the breakdown', () => {
    expect(calculateCommission(25_000)).toMatchObject({ baseAmount: 25_000, baseCommission: 7_500, completedIncrements: 2, bonusTotal: 2_000, total: 9_500 })
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
    expect(calculateCommission(15_000, t)).toMatchObject({ total: 3_000 + 1_000 })
    expect(calculateCommission(0).total).toBe(0)
    expect(calculateCommission(-5).total).toBe(0)
    expect(calculateCommission(50_000, { ...DEFAULT_COMMISSION_TERMS, incrementSize: 0 }).total).toBe(15_000) // no division by zero
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

describe('agreement rules: excluded costs, refunds, termination', () => {
  it('calculates on the gross price: excluded costs are ignored', () => {
    expect(calculateCommission(20_000, DEFAULT_COMMISSION_TERMS, 5_000)).toMatchObject({ amount: 20_000, total: 7_000 })
    expect(calculateCommission(20_000).total).toBe(6_000 + 1_000)
  })
  const d = (s: string): Date => new Date(s)
  const paid = { commissionTotal: 4_500, finalPaymentReceivedAt: d('2026-11-03'), finalPaidAt: d('2026-12-10') }
  it('cancels an unpaid commission when the client is refunded', () => {
    expect(commissionStatus({ ...paid, finalPaidAt: null, refundedAt: d('2026-11-20') })).toEqual({ total: 4_500, paid: 0, payable: 0, pending: 0, voided: 4_500 })
  })
  it('turns a paid commission into a clawback when the client is refunded', () => {
    const s = commissionStatus({ ...paid, refundedAt: d('2026-12-20') })
    expect(s).toMatchObject({ clawback: 4_500, paid: 4_500 })
    expect(salespersonCommissionView(s)).toEqual({ total: 4_500, paid: 4_500, pending: 0, clawback: 4_500 })
  })
  it('pays nothing for a client payment that arrived after termination, but keeps earlier ones', () => {
    const base = { commissionTotal: 4_500, finalPaidAt: null, terminatedAt: d('2026-11-30') }
    expect(commissionStatus({ ...base, finalPaymentReceivedAt: d('2026-12-02') })).toMatchObject({ voided: 4_500, payable: 0 })
    expect(commissionStatus({ ...base, finalPaymentReceivedAt: d('2026-11-20') })).toMatchObject({ payable: 4_500 })
    expect(commissionStatus({ ...base, finalPaymentReceivedAt: null })).toMatchObject({ pending: 4_500 })
  })
})

import { bonusDue, bonusOf, paymentCommission } from '../lib/commission'

describe('commission on each payment, bonus pro rata', () => {
  it('pays 30% of each part: 50 upfront, then the final 50', () => {
    expect(paymentCommission(5_000, 0, 10_000, 30)).toBe(1_500)
    expect(paymentCommission(5_000, 5_000, 10_000, 30)).toBe(1_500)
  })
  it('pays 30% of every payment even above ₪15,000, and the payments add up to the whole', () => {
    const parts = [10_000, 10_000, 10_000]
    let paid = 0
    const each = parts.map((a) => {
      const c = paymentCommission(a, paid, 30_000, 30)
      paid += a
      return c
    })
    expect(each).toEqual([3_000, 3_000, 3_000])
    expect(each.reduce((n, x) => n + x, 0)).toBe(9_000)
    // ₪33.33 thirds: rounding never loses or invents a shekel
    let p2 = 0
    const third = [1_001, 1_001, 1_001].map((a) => {
      const c = paymentCommission(a, p2, 3_003, 30)
      p2 += a
      return c
    })
    expect(third.reduce((n, x) => n + x, 0)).toBe(Math.round(0.3 * 3_003))
  })
  it('earns the bonus pro rata with each payment, and the payments add up to commission plus bonus', () => {
    // price 25,000: 30% = 7,500 plus bonus 2,000. Half paid → half of each.
    expect(paymentCommission(12_500, 0, 25_000, 30, 2_000)).toBe(3_750 + 1_000)
    // 90% paid, 10% held back: 90% of the bonus is already earned
    expect(paymentCommission(22_500, 0, 25_000, 30, 2_000)).toBe(6_750 + 1_800)
    let paid = 0
    const sum = [8_333, 8_333, 8_334].map((a) => { const c = paymentCommission(a, paid, 25_000, 30, 2_000); paid += a; return c }).reduce((n, x) => n + x, 0)
    expect(sum).toBe(7_500 + 2_000)
  })
  it('earns nothing on money above the price, or on nonsense', () => {
    expect(paymentCommission(5_000, 10_000, 10_000, 30)).toBe(0)
    expect(paymentCommission(0, 0, 10_000, 30)).toBe(0)
    expect(paymentCommission(5_000, 0, 0, 30)).toBe(0)
  })
  it('makes the bonus due only when the whole price is paid', () => {
    expect(bonusDue(29_999, 30_000)).toBe(false)
    expect(bonusDue(30_000, 30_000)).toBe(true)
    expect(bonusDue(0, 0)).toBe(false)
    expect(bonusOf({ breakdown: { bonusTotal: 3_000 } })).toBe(3_000)
    expect(bonusOf(null)).toBe(0)
  })

  const d = (s: string): Date => new Date(`${s}T00:00:00Z`)
  const pay = (commission: number, at: string, paid: string | null = null, refunded: string | null = null) => ({ commission, receivedAt: d(at), commissionPaidAt: paid ? d(paid) : null, refundedAt: refunded ? d(refunded) : null })
  const base = { commissionTotal: 12_000, bonus: 0, finalPaymentReceivedAt: null as Date | null, finalPaidAt: null as Date | null }

  it('makes each payment payable as it arrives, with the rest pending', () => {
    const s = commissionStatus({ ...base, payments: [pay(3_000, '2026-11-02')] })
    expect(s).toEqual({ total: 12_000, paid: 0, payable: 3_000, pending: 9_000 })
  })
  it('separates paid from payable payments', () => {
    const s = commissionStatus({ ...base, payments: [pay(3_000, '2026-11-02', '2026-12-04'), pay(3_000, '2026-11-20')] })
    expect(s).toEqual({ total: 12_000, paid: 3_000, payable: 3_000, pending: 6_000 })
  })
  it('shows everything paid once every payment is paid out', () => {
    const three = [pay(4_000, '2026-11-02', '2026-12-04'), pay(4_000, '2026-11-20', '2026-12-04'), pay(4_000, '2026-12-01')]
    expect(commissionStatus({ ...base, finalPaymentReceivedAt: d('2026-12-01'), payments: three })).toEqual({ total: 12_000, paid: 8_000, payable: 4_000, pending: 0 })
    expect(commissionStatus({ ...base, payments: three.map((p) => ({ ...p, commissionPaidAt: d('2026-12-20') })) })).toEqual({ total: 12_000, paid: 12_000, payable: 0, pending: 0 })
  })
  it('cancels an unpaid refunded payment and flags a paid one for clawback', () => {
    expect(commissionStatus({ ...base, payments: [pay(3_000, '2026-11-02', null, '2026-11-10')] })).toMatchObject({ voided: 3_000, payable: 0 })
    expect(commissionStatus({ ...base, payments: [pay(3_000, '2026-11-02', '2026-12-04', '2026-12-10')] })).toMatchObject({ clawback: 3_000, paid: 3_000 })
  })
  it('pays nothing on a payment received after the agreement ended', () => {
    const s = commissionStatus({ ...base, terminatedAt: d('2026-11-30'), finalPaymentReceivedAt: d('2026-12-05'), payments: [pay(3_000, '2026-11-20'), pay(9_000, '2026-12-05')] })
    expect(s).toMatchObject({ payable: 3_000, voided: 9_000 })
  })
})

describe('payments in another currency (final payment, uncapped commission)', () => {
  it('stops commission at the price normally, but not on a final payment that lands a little over it', () => {
    expect(paymentCommission(5_200, 10_000, 15_000, 30)).toBe(1_500) // capped: only the last 5,000 of the price earns
    expect(paymentCommission(5_200, 10_000, 15_000, 30, 0, false)).toBe(1_560) // final payment: 30% of the 5,200 actually received
  })
  it('still pays on a final payment that lands a little under the price', () => {
    expect(paymentCommission(4_900, 10_000, 15_000, 30, 0, false)).toBe(1_470)
  })
})
