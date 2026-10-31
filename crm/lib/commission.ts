// Commission maths. Rates are stored as basis points (1000 = 10%) so there is no floating-point drift.
// No server-only/prisma imports, so this is shared by the dialogs (client) and the pages (server) and is unit-testable.

/** "10" or "7.5" typed by an admin → basis points. Returns null for blank, undefined for something invalid. */
export function percentToBps(input: string | number | null | undefined): number | null | undefined {
  if (input === null || input === undefined) return null
  const text = String(input).trim().replace('%', '').replace(',', '.')
  if (text === '') return null
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(text)) return undefined
  const bps = Math.round(Number(text) * 100)
  return bps >= 0 && bps <= 10000 ? bps : undefined
}

/** Basis points → what an admin types and reads back: 1000 → "10", 750 → "7.5". */
export function bpsToPercent(bps: number | null | undefined): string {
  if (bps == null) return ''
  return String(Number((bps / 100).toFixed(2)))
}

/** The salesman's cut of a won deal, in whole shekels: 10% of 10,000 → 1,000. */
export function commissionCut(dealValue: number | null | undefined, bps: number | null | undefined): number | null {
  if (dealValue == null || bps == null || !Number.isFinite(dealValue) || dealValue < 0) return null
  return Math.round((dealValue * bps) / 10000)
}

/** 1000 → "₪1,000" */
export function formatIls(n: number): string {
  return `₪${n.toLocaleString('en-US')}`
}

/** 1000 → "10%", 750 → "7.5%" */
export function formatBps(bps: number): string {
  return `${bpsToPercent(bps)}%`
}
