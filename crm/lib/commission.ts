/**
 * Salesperson commission: ONE pure function the whole app uses (lead page, win dialog, snapshots, tests).
 * Money is whole shekels; percentages are plain numbers (30 = 30%).
 *
 *  - deal ≤ threshold:  deal × baseRate
 *  - deal > threshold:  threshold × baseRate + bonusPerIncrement × floor((deal − threshold) / incrementSize)
 *    (a partial increment earns nothing)
 *
 * Paid in two parts that match the client's payments: downpaymentShare of the total, and the remainder at the end.
 */
export interface CommissionTerms {
  /** % of the deal (up to the threshold) the salesperson earns */
  baseRatePct: number
  /** Deal size, in ₪, above which bonus increments start counting */
  threshold: number
  /** Size of one bonus increment, in ₪ */
  incrementSize: number
  /** ₪ earned per completed increment above the threshold */
  bonusPerIncrement: number
  /** % of the commission paid with the client's downpayment; the rest is paid with the final balance */
  downpaymentSharePct: number
}

export const DEFAULT_COMMISSION_TERMS: CommissionTerms = {
  baseRatePct: 30,
  threshold: 15_000,
  incrementSize: 5_000,
  bonusPerIncrement: 1_000,
  downpaymentSharePct: 30,
}

export interface CommissionBreakdown {
  amount: number
  /** The part of the deal the base rate applies to (the deal itself, capped at the threshold) */
  baseAmount: number
  baseCommission: number
  completedIncrements: number
  bonusTotal: number
  total: number
  downpayment: number
  final: number
}

const whole = (n: number): number => Math.round(n)
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

export function calculateCommission(dealAmount: number, terms: CommissionTerms = DEFAULT_COMMISSION_TERMS): CommissionBreakdown {
  const amount = Math.max(0, whole(num(dealAmount, 0)))
  const rate = Math.max(0, terms.baseRatePct) / 100
  const baseAmount = Math.min(amount, Math.max(0, terms.threshold))
  const baseCommission = baseAmount * rate
  const completedIncrements = amount > terms.threshold && terms.incrementSize > 0 ? Math.floor((amount - terms.threshold) / terms.incrementSize) : 0
  const bonusTotal = completedIncrements * Math.max(0, terms.bonusPerIncrement)
  const total = whole(baseCommission + bonusTotal)
  const downpayment = whole((total * Math.min(100, Math.max(0, terms.downpaymentSharePct))) / 100)
  return { amount, baseAmount, baseCommission: whole(baseCommission), completedIncrements, bonusTotal: whole(bonusTotal), total, downpayment, final: total - downpayment }
}

/** Reads saved terms (a JSON column) defensively: anything missing or invalid falls back to the default. */
export function parseTerms(raw: unknown, base: CommissionTerms = DEFAULT_COMMISSION_TERMS): CommissionTerms {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const pos = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d)
  return {
    baseRatePct: Math.min(100, pos(o.baseRatePct, base.baseRatePct)),
    threshold: pos(o.threshold, base.threshold),
    incrementSize: pos(o.incrementSize, base.incrementSize),
    bonusPerIncrement: pos(o.bonusPerIncrement, base.bonusPerIncrement),
    downpaymentSharePct: Math.min(100, pos(o.downpaymentSharePct, base.downpaymentSharePct)),
  }
}

/** Terms for one deal: the salesperson's saved terms, with any per-deal overrides on top. */
export function dealTerms(salespersonTerms: unknown, overrides: unknown): CommissionTerms {
  return parseTerms(overrides, parseTerms(salespersonTerms))
}

export interface MilestoneDates {
  downpaymentReceivedAt: Date | null
  finalPaymentReceivedAt: Date | null
  downpaymentPaidAt: Date | null
  finalPaidAt: Date | null
}

export interface CommissionStatus {
  total: number
  /** Already paid out to the salesperson */
  paid: number
  /** The client has paid that milestone, but the salesperson has not been paid yet */
  payable: number
  /** The client has not paid that milestone yet, so nothing is due */
  pending: number
}

/** Paid / payable / pending for one won deal. Nothing is payable before the client's money is collected. */
export function commissionStatus(c: { commissionTotal: number | null; commissionDownpayment: number | null; commissionFinal: number | null } & MilestoneDates): CommissionStatus {
  const total = c.commissionTotal ?? 0
  const parts: [number, Date | null, Date | null][] = [
    [c.commissionDownpayment ?? 0, c.downpaymentReceivedAt, c.downpaymentPaidAt],
    [c.commissionFinal ?? 0, c.finalPaymentReceivedAt, c.finalPaidAt],
  ]
  let paid = 0
  let payable = 0
  let pending = 0
  for (const [amount, received, paidAt] of parts) {
    if (received && paidAt) paid += amount
    else if (received) payable += amount
    else pending += amount
  }
  return { total, paid, payable, pending }
}

/** What a salesperson may see about a won deal: the commission, how much is paid and how much is still to come. */
export function salespersonCommissionView(s: CommissionStatus): { total: number; paid: number; pending: number } {
  return { total: s.total, paid: s.paid, pending: s.total - s.paid }
}

export const formatIls = (n: number): string => `₪${Math.round(n).toLocaleString('en-US')}`
