/**
 * Salesperson commission: ONE pure function the whole app uses (lead page, win dialog, snapshots, tests).
 * Money is whole shekels; percentages are plain numbers (30 = 30%).
 *
 *  - deal ≤ threshold:  deal × baseRate
 *  - deal > threshold:  threshold × baseRate + bonusPerIncrement × floor((deal − threshold) / incrementSize)
 *    (a partial increment earns nothing)
 *
 * The commission becomes payable once the client's payment is collected, and is then paid out in one go.
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
}

export const DEFAULT_COMMISSION_TERMS: CommissionTerms = {
  baseRatePct: 30,
  threshold: 15_000,
  incrementSize: 5_000,
  bonusPerIncrement: 1_000,
}

export interface CommissionBreakdown {
  amount: number
  /** The part of the deal the base rate applies to (the deal itself, capped at the threshold) */
  baseAmount: number
  baseCommission: number
  completedIncrements: number
  bonusTotal: number
  total: number
  /** Costs taken off the price before the commission was calculated (only present when there were some) */
  excludedCosts?: number
}

const whole = (n: number): number => Math.round(n)
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

/**
 * `excludedCosts` (third-party hosting, taxes, out-of-pocket) come off the price first: the agreement pays on the
 * contract price collected excluding them. The breakdown only mentions them when there are some.
 */
export function calculateCommission(dealAmount: number, terms: CommissionTerms = DEFAULT_COMMISSION_TERMS, excludedCosts = 0): CommissionBreakdown {
  const excluded = Math.max(0, whole(num(excludedCosts, 0)))
  const amount = Math.max(0, whole(num(dealAmount, 0)) - excluded)
  const rate = Math.max(0, terms.baseRatePct) / 100
  const baseAmount = Math.min(amount, Math.max(0, terms.threshold))
  const baseCommission = baseAmount * rate
  const completedIncrements = amount > terms.threshold && terms.incrementSize > 0 ? Math.floor((amount - terms.threshold) / terms.incrementSize) : 0
  const bonusTotal = completedIncrements * Math.max(0, terms.bonusPerIncrement)
  // A commission can never exceed the deal itself, and always fits the database column (Int4).
  const total = Math.min(whole(baseCommission + bonusTotal), amount, 2_000_000_000)
  return { amount, baseAmount, baseCommission: whole(baseCommission), completedIncrements, bonusTotal: whole(bonusTotal), total, ...(excluded > 0 ? { excludedCosts: excluded } : {}) }
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
  }
}

/** Terms for one deal: the salesperson's saved terms, with any per-deal overrides on top. */
export function dealTerms(salespersonTerms: unknown, overrides: unknown): CommissionTerms {
  return parseTerms(overrides, parseTerms(salespersonTerms))
}

export interface PaymentDates {
  /** The client paid us: the commission is payable from this date */
  finalPaymentReceivedAt: Date | null
  /** The salesperson was paid their commission */
  finalPaidAt: Date | null
  /** The client's money was returned: a paid commission is clawed back, an unpaid one is cancelled */
  refundedAt?: Date | null
  /** The salesperson's agreement ended on this date: a client payment that arrived later earns nothing */
  terminatedAt?: Date | null
}

export interface CommissionStatus {
  total: number
  /** Already paid out to the salesperson */
  paid: number
  /** The client has paid, but the salesperson has not been paid yet */
  payable: number
  /** The client has not paid yet, so nothing is due */
  pending: number
  /** Cancelled: the client was refunded before payout, or paid only after the agreement ended. Not owed. */
  voided?: number
  /** Already paid, but the client's money came back: an overpayment to deduct from later payouts */
  clawback?: number
}

/** Paid / payable / pending for one won deal. Nothing is payable before the client's money is collected. */
export function commissionStatus(c: { commissionTotal: number | null } & PaymentDates): CommissionStatus {
  const total = c.commissionTotal ?? 0
  if (c.refundedAt) return c.finalPaidAt ? { total, paid: total, payable: 0, pending: 0, clawback: total } : { total, paid: 0, payable: 0, pending: 0, voided: total }
  if (c.terminatedAt && c.finalPaymentReceivedAt && c.finalPaymentReceivedAt > c.terminatedAt && !c.finalPaidAt) return { total, paid: 0, payable: 0, pending: 0, voided: total }
  if (c.finalPaymentReceivedAt && c.finalPaidAt) return { total, paid: total, payable: 0, pending: 0 }
  if (c.finalPaymentReceivedAt) return { total, paid: 0, payable: total, pending: 0 }
  return { total, paid: 0, payable: 0, pending: total }
}

/** What a salesperson may see about a won deal: the commission, how much is paid and how much is still to come. */
export function salespersonCommissionView(s: CommissionStatus): { total: number; paid: number; pending: number; clawback?: number } {
  return { total: s.total, paid: s.paid, pending: s.total - s.paid - (s.voided ?? 0) - (s.clawback ? s.total - s.paid : 0), ...(s.clawback ? { clawback: s.clawback } : {}) }
}

export const formatIls = (n: number): string => `₪${Math.round(n).toLocaleString('en-US')}`
