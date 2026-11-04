/**
 * Salesman commission agreement: one fixed template, only the name, date and figures change.
 * Pure functions (no database, no server-only) so the wording and the token can be unit-tested.
 * Nothing here is stored: the contract data lives inside a signed link.
 */

export interface Figures {
  /** Deals up to this amount pay `basePercent` of the deal (ILS) */
  threshold: number
  /** Percent of the deal paid on deals up to the threshold */
  basePercent: number
  /** Bonus ILS for every completed increment above the threshold */
  bonus: number
  /** Increment size above the threshold (ILS) */
  increment: number
  /** Milestone 1: percent of the collected downpayment */
  milestone1Percent: number
}

export interface ContractData {
  name: string
  email: string
  /** ISO date yyyy-mm-dd */
  effectiveDate: string
  figures: Figures
}

export const DEFAULT_FIGURES: Figures = { threshold: 15000, basePercent: 30, bonus: 1000, increment: 5000, milestone1Percent: 30 }

export const basePayout = (f: Figures): number => Math.round((f.threshold * f.basePercent) / 100)

export function validate(d: ContractData): string | null {
  if (d.name.trim().length < 2 || d.name.length > 120) return 'Enter the representative’s full name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email) || d.email.length > 200) return 'Enter a valid email for the representative.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.effectiveDate) || Number.isNaN(Date.parse(d.effectiveDate))) return 'Choose the effective date.'
  const f = d.figures
  const pos = (n: number, max: number): boolean => Number.isFinite(n) && n > 0 && n <= max
  if (!pos(f.threshold, 10_000_000)) return 'The tier threshold must be a positive amount.'
  if (!pos(f.basePercent, 100)) return 'The base commission must be between 1% and 100%.'
  if (!pos(f.bonus, 10_000_000)) return 'The bonus must be a positive amount.'
  if (!pos(f.increment, 10_000_000)) return 'The bonus increment must be a positive amount.'
  if (!pos(f.milestone1Percent, 100)) return 'The milestone 1 percentage must be between 1% and 100%.'
  return null
}

export const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const ils = (n: number): string => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)} ILS`
const pct = (n: number): string => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)}%`

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(`${iso}T00:00:00Z`))
}

/** The agreement body (the immutable template with the per-agreement values filled in). Values are HTML-escaped. */
export function agreementBodyHtml(d: ContractData): string {
  const f = d.figures
  const name = esc(d.name.trim())
  return `
<h1>Sales Commission Agreement &amp; Payout Terms</h1>
<p class="meta">Representative: ${name} | Effective Date: ${esc(formatDate(d.effectiveDate))}</p>
<h2>1. AGREEMENT SCOPE</h2>
<p>This document sets forth the binding commission structure and milestone payout terms for sales representation services provided by ${name} for Igani.</p>
<h2>2. COMMISSION STRUCTURE &amp; TIERED RULES</h2>
<div class="box">
  <p class="boxtitle">Standard Commission Schedule</p>
  <p class="item"><b>Deals up to ${ils(f.threshold)}:</b> Representative receives ${pct(f.basePercent)} total commission.</p>
  <p class="item"><b>Deals above ${ils(f.threshold)}:</b> Base payout of ${ils(basePayout(f))} (${pct(f.basePercent)} of ${ils(f.threshold)}) plus an additional ${ils(f.bonus)} bonus for every completed ${ils(f.increment)} increment above ${ils(f.threshold)}.</p>
</div>
<h2>3. MILESTONE PAYOUT TERMS (DOWNPAYMENT &amp; FINAL PAYMENT)</h2>
<p>Commissions are disbursed in alignment with client payment milestones:</p>
<p class="item"><b>Milestone 1 (Initial Downpayment):</b> When the client pays the initial downpayment upon project sign-off, the representative receives ${pct(f.milestone1Percent)} of the collected downpayment amount. The downpayment amount is set per deal and is not fixed at any particular percentage of the contract.</p>
<p class="item"><b>Milestone 2 (Final Payment):</b> The remaining balance of the representative’s commission is paid once the website has been delivered to the client and the client’s remaining payment has been received.</p>
<p class="note"><b>Note:</b> Total commission across both milestones equals the full calculated commission amount for the contract. No commission is advanced prior to funds being collected from the client.</p>`
}

export const AGREEMENT_CSS = `
.agr{font-family:Helvetica,Arial,sans-serif;color:#0b1b33;font-size:13.5px;line-height:1.55}
.agr h1{font-size:24px;margin:0 0 6px;color:#0b1b33}
.agr .meta{color:#475569;margin:0 0 22px}
.agr h2{font-size:13px;letter-spacing:.06em;margin:24px 0 8px;color:#0b1b33}
.agr p{margin:0 0 10px}
.agr .box{border:1px solid #dbe3ef;border-left:4px solid #2563eb;border-radius:6px;padding:12px 16px;background:#f8fafc;margin:0 0 10px}
.agr .boxtitle{font-weight:700;margin-bottom:8px}
.agr .item{padding-left:14px;border-left:2px solid #e2e8f0}
.agr .note{background:#f1f5f9;border-radius:6px;padding:10px 14px;margin-top:14px;color:#334155}
`

/** Full HTML document for the PDF (letterhead + agreement). */
export function agreementDocumentHtml(d: ContractData): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0}
.head{text-align:right;font-family:Helvetica,Arial,sans-serif;color:#475569;font-size:11px;line-height:1.5;margin-bottom:26px}
.head b{display:block;font-size:22px;color:#0b1b33}
${AGREEMENT_CSS}
</style></head><body>
<div class="head"><b>Igani.</b>Yosef Lapid 1, Netanya, Israel<br>info@igani.co</div>
<div class="agr">${agreementBodyHtml(d)}</div>
</body></html>`
}

