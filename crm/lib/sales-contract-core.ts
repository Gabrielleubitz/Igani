/**
 * Salesman commission agreement: one fixed template, only the name, date and figures change.
 * Pure functions (no database, no server-only) so the wording and the token can be unit-tested.
 * The signed agreement is stored by lib/sales-contract-store.ts.
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
}

/** Terms the lawyer's agreement leaves open. Every one is required: no blank may reach a signed copy. */
export interface LegalTerms {
  /** The company as named in the agreement (Igani's legal entity) */
  companyLegalName: string
  companyAddress: string
  /** The representative's address */
  agentAddress: string
  /** Commissions earned in a month are paid within this many business days after the month ends */
  payoutDays: number
  /** A paid commission is clawed back if the client's money is returned within this many days of the transaction */
  clawbackDays: number
  /** Either party may end the agreement with this many days' written notice */
  noticeDays: number
  /** Governing law and courts, for example "the State of Israel" */
  jurisdiction: string
}

export interface ContractData {
  name: string
  email: string
  /** ISO date yyyy-mm-dd */
  effectiveDate: string
  figures: Figures
  terms: LegalTerms
}

/** Not defaults: the form starts empty for the legal terms so each one is chosen on purpose. */
export const EMPTY_TERMS: LegalTerms = { companyLegalName: '', companyAddress: '', agentAddress: '', payoutDays: NaN, clawbackDays: NaN, noticeDays: NaN, jurisdiction: '' }
export const CONTRACT_VERSION = '2026-11-lawyer-v1'

export const DEFAULT_FIGURES: Figures = { threshold: 15000, basePercent: 30, bonus: 1000, increment: 5000 }

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
  const t = d.terms
  if (!t) return 'Fill in the legal terms.'
  const text = (v: string, min: number, max: number): boolean => typeof v === 'string' && v.trim().length >= min && v.length <= max
  if (!text(t.companyLegalName, 2, 160)) return 'Enter the company’s legal name.'
  if (!text(t.companyAddress, 5, 300)) return 'Enter the company’s address.'
  if (!text(t.agentAddress, 5, 300)) return 'Enter the representative’s address.'
  const days = (n: number, max: number): boolean => Number.isInteger(n) && n > 0 && n <= max
  if (!days(t.payoutDays, 90)) return 'Payout days must be a whole number of business days (1 to 90).'
  if (!days(t.clawbackDays, 730)) return 'The clawback window must be a whole number of days (1 to 730).'
  if (!days(t.noticeDays, 365)) return 'Termination notice must be a whole number of days (1 to 365).'
  if (!text(t.jurisdiction, 2, 160)) return 'Enter the governing jurisdiction.'
  return null
}

/** Names must match exactly (only stray spaces around/between words are ignored). */
export const normName = (s: string): string => s.normalize('NFC').trim().replace(/\s+/g, ' ')
export const namesMatch = (typed: string, expected: string): boolean => normName(typed) === normName(expected)

export const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const ils = (n: number): string => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)} ILS`
const pct = (n: number): string => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)}%`

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(`${iso}T00:00:00Z`))
}

/** The eight numbered sections of the lawyer's agreement, with this agreement's values filled in. Values are HTML-escaped. */
export function agreementSectionsHtml(d: ContractData): string {
  const f = d.figures
  const t = d.terms
  const name = esc(d.name.trim())
  const company = esc(t.companyLegalName.trim())
  return `
<h2><span class="n">1.</span>APPOINTMENT AND SCOPE</h2>
<p class="clause">${company} (the “Company”) engages ${name} (the “Sales Representative”) to solicit, introduce and secure clients for the Company’s web development, design and digital architecture services. The Sales Representative acts as an independent contractor and not as an employee, partner or legal representative of the Company.</p>
<h2><span class="n">2.</span>COMMISSION TRIGGER EVENT</h2>
<p class="clause">The Sales Representative earns a commission only when both of the following have happened (the “Trigger Event”):</p>
<p class="item">The Company has received a fully executed, signed client agreement or statement of work, <b>and</b></p>
<p class="item">the Company has received, in cleared funds, the full amount owed by the referred client under that agreement.</p>
<p class="clause">No commission is earned or payable for unsigned proposals, defaulted payments, partly paid accounts or unpaid client accounts. No commission is paid in part, or advanced, before the full amount has been collected.</p>
<h2><span class="n">3.</span>COMMISSION RATE AND CALCULATION</h2>
<div class="box">
  <p class="boxtitle">Commission schedule (tiered)</p>
  <p class="item"><b>Deals up to ${ils(f.threshold)}:</b> the Sales Representative receives ${pct(f.basePercent)} of the calculation base.</p>
  <p class="item"><b>Deals above ${ils(f.threshold)}:</b> a base payout of ${ils(basePayout(f))} (${pct(f.basePercent)} of ${ils(f.threshold)}) plus an additional ${ils(f.bonus)} bonus for every completed ${ils(f.increment)} increment above ${ils(f.threshold)}. A part increment earns nothing.</p>
</div>
<p class="clause"><b>Calculation base:</b> the contract price collected by the Company from the secured client, excluding third-party hosting fees, taxes and direct out-of-pocket expenses.</p>
<p class="clause"><b>Commission type:</b> tiered commission on a collected contract price, as set out above.</p>
<h2><span class="n">4.</span>PAYMENT SCHEDULE</h2>
<p class="clause">Commissions earned in a calendar month are processed and paid by the Company within <b>${t.payoutDays} business days</b> after the end of that month, provided all invoiced funds have cleared.</p>
<h2><span class="n">5.</span>CLAWBACKS AND REFUNDS</h2>
<p class="clause">If a client defaults, receives a legitimate refund, or the Company returns funds because the project was not delivered or is in dispute, within <b>${t.clawbackDays} days</b> of the transaction, any commission paid for that transaction is an overpayment. The Company may deduct that amount from future commission payments or ask the Sales Representative to repay it directly.</p>
<h2><span class="n">6.</span>CONFIDENTIALITY AND INTELLECTUAL PROPERTY</h2>
<p class="clause">The Sales Representative may receive proprietary business information, client lists, code structures and trade secrets belonging to the Company. The Sales Representative keeps all of it strictly confidential and does not use it for competing ventures or give it to unauthorized third parties.</p>
<h2><span class="n">7.</span>TERMINATION AND PENDING DEALS</h2>
<p class="clause">Either party may end this agreement with <b>${t.noticeDays} days’ written notice</b> to the other party.</p>
<p class="clause">After termination, the Sales Representative is still entitled to commission on deals where the Trigger Event happened before the termination takes effect. No commission accrues or is payable on deals finalized or paid after the termination date, whatever earlier negotiations or discussions took place.</p>
<h2><span class="n">8.</span>GOVERNING LAW AND DISPUTE RESOLUTION</h2>
<p class="clause">This agreement is governed by, and enforced in accordance with, the laws of <b>${esc(t.jurisdiction.trim())}</b>. Any dispute under this agreement is resolved exclusively by binding arbitration or by the local courts of that jurisdiction.</p>`
}

export interface SignerView {
  name: string
  email: string
  /** PNG data URL, or null when not signed yet */
  signature: string | null
  /** Already formatted (Israel time) or null */
  signedAt: string | null
}

export interface AgreementView {
  /** URL or data URL of the Igani logo */
  logo: string
  status: 'preview' | 'pending' | 'signed'
  /** Short reference shown in the header (link id) */
  reference: string
  admin: SignerView
  rep: SignerView
  /** Signature record (signed PDF only) */
  record?: { ip: string; browser: string; sha256: string }
}

const IMG_DATA = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/
const sigImg = (src: string | null): string => (src && IMG_DATA.test(src) ? `<img src="${src}" alt="" />` : '')

/** The branded agreement (same look as the offer contracts): header with logo, parties, sections, signature cards, record. */
export function agreementHtml(d: ContractData, v: AgreementView): string {
  const badge = v.status === 'signed' ? 'Signed' : v.status === 'pending' ? 'Awaiting signature' : 'Preview'
  const card = (role: string, s: SignerView, extra = ''): string => `
    <div class="sig"><div class="role">${role}</div>
      <div class="sigline">${sigImg(s.signature)}</div><div class="siglabel">Signature</div>
      <table class="sigtable">
        <tr><td>Name</td><td dir="auto">${esc(s.name) || '&nbsp;'}</td></tr>
        <tr><td>Email</td><td dir="ltr">${esc(s.email) || '&nbsp;'}</td></tr>
        <tr><td>Date</td><td>${s.signedAt ? esc(s.signedAt) : '<span class="muted">Completed at signing</span>'}</td></tr>${extra}
      </table></div>`
  const party = (role: string, name: string, email: string, address = ''): string => `
    <div class="party"><div class="role">${role}</div><div class="pname" dir="auto">${esc(name)}</div><div class="pline" dir="ltr">${esc(email)}</div>${address ? `<div class="pline" dir="auto">${esc(address)}</div>` : ''}</div>`
  return `<div class="agr">
  <div class="top"><img class="logo" src="${esc(v.logo)}" alt="Igani" /><span class="badge">${badge}</span></div>
  <h1>Commission Agreement</h1>
  <p class="sub">Representative: ${esc(d.name.trim())} | Effective Date: ${esc(formatDate(d.effectiveDate))}</p>
  <div class="meta"><span>Reference: <b dir="ltr">${esc(v.reference)}</b></span><span>Effective: <b>${esc(formatDate(d.effectiveDate))}</b></span></div>
  <div class="parties">${party(d.terms.companyLegalName.trim() || 'Igani', v.admin.name, v.admin.email, d.terms.companyAddress.trim())}${party('Sales representative', d.name.trim(), d.email, d.terms.agentAddress.trim())}</div>
  ${agreementSectionsHtml(d)}
  <h2 class="sighead">Signatures</h2>
  <div class="sigs">${card('For the Company', v.admin)}${card('For the Sales Representative', v.rep, v.record ? `<tr><td>IP address</td><td dir="ltr">${esc(v.record.ip)}</td></tr>` : '')}</div>
  ${
    v.record
      ? `<div class="record"><div class="role" style="margin-bottom:6px">Signature record</div><table>
    <tr><td>Browser</td><td dir="ltr">${esc(v.record.browser)}</td></tr>
    <tr><td>Fingerprint (SHA-256)</td><td class="mono-hash" dir="ltr">${esc(v.record.sha256)}</td></tr>
  </table><div class="note" style="margin-top:6px">This agreement was signed electronically by both parties. Electronic signatures bind the parties. A copy of the signed agreement is kept in the Company’s records.</div></div>`
      : ''
  }
</div>`
}

/** Same visual language as lib/contract-html.ts (offers): Heebo, accent rule, badge, cards. */
export const AGREEMENT_CSS = `
.agr{--accent:#2563eb;--ink:#0f172a;--muted:#64748b;--line:#e2e8f0;font-family:Heebo,Helvetica,Arial,sans-serif;color:var(--ink);font-size:10.5pt;line-height:1.6}
.agr *{box-sizing:border-box}
.agr .top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:18px;border-bottom:2px solid var(--accent)}
.agr .logo{height:34px;width:auto;max-width:170px;object-fit:contain}
.agr .badge{display:inline-block;font-size:8pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);background:#eaf1fe;padding:3px 9px;border-radius:999px}
.agr h1{font-size:21pt;line-height:1.2;margin:22px 0 4px;letter-spacing:-.01em}
.agr .sub{color:var(--muted);font-size:11.5pt;margin:0}
.agr .meta{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:12px;font-size:8.5pt;color:var(--muted)}
.agr .meta b{color:var(--ink)}
.agr .parties{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:22px 0 8px}
.agr .party{border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:#f8fafc}
.agr .role{font-size:7.5pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.agr .pname{font-weight:700;font-size:12pt;margin-top:2px}
.agr .pline{font-size:9pt;color:#334155}
.agr .muted{color:var(--muted)}
.agr h2{font-size:12pt;margin:22px 0 6px;display:flex;gap:8px;align-items:baseline;break-after:avoid}
.agr h2 .n{color:var(--accent)}
.agr p{margin:0 0 8px}
.agr .box{border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:10px;padding:12px 16px;background:#f8fafc;margin:0 0 8px;break-inside:avoid}
.agr .boxtitle{font-weight:700;margin-bottom:6px}
.agr .item{padding-left:12px;border-left:2px solid var(--line)}
.agr .box .item:last-child{margin-bottom:0}
.agr .note{background:#f1f5f9;border-radius:10px;padding:10px 14px;margin-top:12px;color:#334155;font-size:9.5pt}
.agr .sighead{margin-top:28px}
.agr .sigs{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px;break-inside:avoid}
.agr .sig{border:1px solid var(--line);border-radius:12px;padding:14px}
.agr .sigline{height:70px;border-bottom:1px dashed #94a3b8;display:flex;align-items:flex-end;justify-content:center;margin-top:8px}
.agr .sigline img{max-height:66px;max-width:100%;object-fit:contain}
.agr .siglabel{font-size:7.5pt;color:var(--muted);margin:3px 0 8px}
.agr .sigtable{width:100%;border-collapse:collapse;font-size:9pt}
.agr .sigtable td{padding:3px 0;border-bottom:1px solid #f1f5f9;vertical-align:top}
.agr .sigtable td:first-child{color:var(--muted);width:34%}
.agr .record{margin-top:20px;border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:#f8fafc;font-size:8.5pt;break-inside:avoid}
.agr .record table{border-collapse:collapse;width:100%}
.agr .record td{padding:2px 0;vertical-align:top}
.agr .record td:first-child{color:var(--muted);width:30%}
.agr .mono-hash{font-family:ui-monospace,Menlo,monospace;font-size:7.5pt;word-break:break-all}
@media (max-width:560px){.agr .parties,.agr .sigs{grid-template-columns:1fr}.agr h1{font-size:17pt}}
`
