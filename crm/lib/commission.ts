/**
 * Salesperson commission: ONE pure function the whole app uses (lead page, win dialog, snapshots, tests).
 * Money is whole shekels; percentages are plain numbers (30 = 30%).
 *
 *  - the base rate applies to EVERY payment the client makes (the price minus excluded costs, whatever its size)
 *  - bonus (paid only at the very end, once the whole price has been paid):
 *      bonusPerIncrement × floor((price − threshold) / incrementSize), and nothing for a partial increment
 *
 * Each payment's commission becomes payable when that payment is collected; the bonus when the price is fully paid.
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
  /** The part of the deal the base rate applies to (the price minus excluded costs) */
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
  const baseAmount = amount
  const baseCommission = baseAmount * rate
  const completedIncrements = amount > terms.threshold && terms.incrementSize > 0 ? Math.floor((amount - terms.threshold) / terms.incrementSize) : 0
  const bonusTotal = completedIncrements * Math.max(0, terms.bonusPerIncrement)
  // A commission can never exceed the deal itself, and always fits the database column (Int4).
  const total = Math.min(whole(baseCommission + bonusTotal), amount, 2_000_000_000)
  return { amount, baseAmount, baseCommission: whole(baseCommission), completedIncrements, bonusTotal: whole(bonusTotal), total, ...(excluded > 0 ? { excludedCosts: excluded } : {}) }
}

/**
 * The commission on ONE payment: the base rate applied to that payment's commissionable share (excluded costs are spread over the
 * payments in proportion). It is the difference between the commission on everything paid after it and before it, rounded once, so
 * the payments always add up to exactly the commission on the full price. Overpayment above the price earns nothing extra.
 */
export function paymentCommission(amount: number, paidBefore: number, price: number, excludedCosts: number, ratePct: number, capAtPrice = true): number {
  if (!(price > 0) || !(amount > 0)) return 0
  const share = (price - Math.min(Math.max(0, excludedCosts), price)) / price
  const upTo = (paid: number): number => Math.round((Math.max(0, ratePct) / 100) * share * (capAtPrice ? Math.min(Math.max(0, paid), price) : Math.max(0, paid)))
  return upTo(paidBefore + amount) - upTo(paidBefore)
}

/** The bonus is due only when the client has paid the whole price. */
export const bonusDue = (paid: number, price: number): boolean => price > 0 && paid >= price

/** The bonus part of a frozen commission snapshot (0 when there is none). */
export function bonusOf(snapshot: unknown): number {
  const b = ((snapshot as { breakdown?: { bonusTotal?: unknown } } | null)?.breakdown?.bonusTotal ?? 0) as unknown
  return typeof b === 'number' && Number.isFinite(b) && b > 0 ? b : 0
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

/** One client payment and the commission on it. */
export interface PaymentLine {
  commission: number
  receivedAt: Date
  commissionPaidAt: Date | null
  refundedAt: Date | null
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

/**
 * Paid / payable / pending for one won deal. Nothing is payable before the client's money is collected.
 * With `payments` (the normal case) every payment's commission is payable as that payment arrives, and the bonus (`bonus`) only once
 * the whole price is paid (`finalPaymentReceivedAt`). Without `payments`, the older one-payment rules apply.
 */
export function commissionStatus(c: { commissionTotal: number | null; bonus?: number; payments?: PaymentLine[] } & PaymentDates): CommissionStatus {
  const total = c.commissionTotal ?? 0
  if (c.payments !== undefined) return commissionStatusByPayment(c as { commissionTotal: number | null; bonus?: number; payments: PaymentLine[] } & PaymentDates, total)
  if (c.refundedAt) return c.finalPaidAt ? { total, paid: total, payable: 0, pending: 0, clawback: total } : { total, paid: 0, payable: 0, pending: 0, voided: total }
  if (c.terminatedAt && c.finalPaymentReceivedAt && c.finalPaymentReceivedAt > c.terminatedAt && !c.finalPaidAt) return { total, paid: 0, payable: 0, pending: 0, voided: total }
  if (c.finalPaymentReceivedAt && c.finalPaidAt) return { total, paid: total, payable: 0, pending: 0 }
  if (c.finalPaymentReceivedAt) return { total, paid: 0, payable: total, pending: 0 }
  return { total, paid: 0, payable: 0, pending: total }
}

function commissionStatusByPayment(c: { bonus?: number; payments: PaymentLine[] } & PaymentDates, total: number): CommissionStatus {
  let paid = 0
  let payable = 0
  let voided = 0
  let clawback = 0
  const settle = (amount: number, receivedAt: Date, paidAt: Date | null, refundedAt: Date | null | undefined): void => {
    if (amount <= 0) return
    if (c.refundedAt || refundedAt) {
      // The client's money came back: a paid commission is an overpayment to claw back, an unpaid one is cancelled
      if (paidAt) { paid += amount; clawback += amount } else voided += amount
    } else if (c.terminatedAt && receivedAt > c.terminatedAt && !paidAt) voided += amount
    else if (paidAt) paid += amount
    else payable += amount
  }
  for (const p of c.payments) settle(p.commission, p.receivedAt, p.commissionPaidAt, p.refundedAt)
  // The bonus only exists once the whole price has been paid
  if (c.finalPaymentReceivedAt) settle(c.bonus ?? 0, c.finalPaymentReceivedAt, c.finalPaidAt, null)
  const pending = Math.max(0, total - paid - payable - voided)
  return { total, paid, payable, pending, ...(voided > 0 ? { voided } : {}), ...(clawback > 0 ? { clawback } : {}) }
}

/** The row of a won deal as the pages select it; `statusOf` turns it into paid / payable / pending. */
export interface DealRow {
  commissionTotal: number | null
  commissionSnapshot?: unknown
  finalPaymentReceivedAt: Date | null
  finalPaidAt: Date | null
  refundedAt?: Date | null
  terminatedAt?: Date | null
  payments: { commission: number; receivedAt: Date; commissionPaidAt: Date | null; refundedAt: Date | null }[]
}

export const statusOf = (r: DealRow): CommissionStatus =>
  commissionStatus({ commissionTotal: r.commissionTotal, bonus: bonusOf(r.commissionSnapshot), finalPaymentReceivedAt: r.finalPaymentReceivedAt, finalPaidAt: r.finalPaidAt, refundedAt: r.refundedAt ?? null, terminatedAt: r.terminatedAt ?? null, payments: r.payments })

/** What a salesperson may see about a won deal: the commission, how much is paid and how much is still to come. */
export function salespersonCommissionView(s: CommissionStatus): { total: number; paid: number; pending: number; clawback?: number } {
  return { total: s.total, paid: s.paid, pending: Math.max(0, s.total - s.paid - (s.voided ?? 0)), ...(s.clawback ? { clawback: s.clawback } : {}) }
}

export const formatIls = (n: number): string => `₪${Math.round(n).toLocaleString('en-US')}`
