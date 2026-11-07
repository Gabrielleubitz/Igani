/**
 * Monthly payouts under the commission agreement: commissions earned in a calendar month (the client's money arrived that
 * month) are due within N business days after the month ends. Pure functions, no database.
 * Business days are Sunday to Thursday (Israel); public holidays are not counted out.
 */

const IL_TZ = 'Asia/Jerusalem'

/** The calendar month (YYYY-MM) of a moment, on Israel time. */
export function monthKey(d: Date): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: IL_TZ, year: 'numeric', month: '2-digit' }).formatToParts(d)
  return `${p.find((x) => x.type === 'year')?.value}-${p.find((x) => x.type === 'month')?.value}`
}

/** Last calendar day (UTC midnight) of a YYYY-MM month. */
export function endOfMonth(key: string): Date {
  const [y = 1970, m = 1] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0))
}

const isBusinessDay = (d: Date): boolean => d.getUTCDay() <= 4 // Sun(0) … Thu(4)

/** The date that is `n` business days after `from` (UTC midnight dates). */
export function addBusinessDays(from: Date, n: number): Date {
  const d = new Date(from)
  let left = Math.max(0, Math.floor(n))
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1)
    if (isBusinessDay(d)) left--
  }
  return d
}

/** When a commission earned in `month` is due, given the representative's agreed payout days (null = no signed agreement). */
export function payoutDueDate(month: string, payoutDays: number | null): Date | null {
  return payoutDays === null ? null : addBusinessDays(endOfMonth(month), payoutDays)
}

export interface PayoutRow {
  leadId: string
  lead: string
  salesperson: string
  email: string | null
  amount: number
  receivedAt: Date | null
  paidAt: Date | null
  refundedAt: Date | null
  /** Agreed payout days / clawback window from the representative's latest signed agreement, or null */
  payoutDays: number | null
  clawbackDays: number | null
}

export interface MonthGroup {
  month: string
  dueDate: Date | null
  rows: PayoutRow[]
  total: number
}

export interface Clawback {
  row: PayoutRow
  /** Refund came within the agreed clawback window (null when there is no signed agreement to check against) */
  withinWindow: boolean | null
}

const DAY = 86_400_000

/** Payable commissions grouped by the month the client's money arrived; clawbacks listed apart. */
export function groupPayouts(rows: PayoutRow[]): { months: MonthGroup[]; clawbacks: Clawback[] } {
  const by = new Map<string, MonthGroup>()
  const clawbacks: Clawback[] = []
  for (const r of rows) {
    if (!r.receivedAt) continue
    if (r.refundedAt) {
      if (r.paidAt) {
        const days = r.clawbackDays
        clawbacks.push({ row: r, withinWindow: days === null ? null : r.refundedAt.getTime() - r.receivedAt.getTime() <= days * DAY })
      }
      continue
    }
    if (r.paidAt) continue
    const month = monthKey(r.receivedAt)
    const g = by.get(month) ?? { month, dueDate: null, rows: [], total: 0 }
    g.rows.push(r)
    g.total += r.amount
    by.set(month, g)
  }
  const months = [...by.values()].sort((a, b) => a.month.localeCompare(b.month))
  for (const g of months) {
    const days = g.rows.map((r) => r.payoutDays).filter((d): d is number => d !== null)
    g.dueDate = days.length ? payoutDueDate(g.month, Math.min(...days)) : null
  }
  return { months, clawbacks }
}
