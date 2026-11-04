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
}

export interface ContractData {
  name: string
  email: string
  /** ISO date yyyy-mm-dd */
  effectiveDate: string
  figures: Figures
}

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

/** The numbered sections (the immutable template with the per-agreement values filled in). Values are HTML-escaped. */
export function agreementSectionsHtml(d: ContractData): string {
  const f = d.figures
  const name = esc(d.name.trim())
  return `
<h2><span class="n">1.</span>AGREEMENT SCOPE</h2>
<p class="clause">This document sets forth the binding commission structure and payout terms for sales representation services provided by ${name} for Igani.</p>
<h2><span class="n">2.</span>COMMISSION STRUCTURE &amp; TIERED RULES</h2>
<div class="box">
  <p class="boxtitle">Standard Commission Schedule</p>
  <p class="item"><b>Deals up to ${ils(f.threshold)}:</b> Representative receives ${pct(f.basePercent)} total commission.</p>
  <p class="item"><b>Deals above ${ils(f.threshold)}:</b> Base payout of ${ils(basePayout(f))} (${pct(f.basePercent)} of ${ils(f.threshold)}) plus an additional ${ils(f.bonus)} bonus for every completed ${ils(f.increment)} increment above ${ils(f.threshold)}.</p>
</div>
<h2><span class="n">3.</span>PAYOUT TERMS</h2>
<p class="item"><b>Payment on full collection:</b> The representative’s commission for a deal is paid only after the client has paid in full everything owed under the contract. No commission is paid in part, or advanced, before the full amount has been collected from the client.</p>
<p class="note"><b>Note:</b> The commission amount is calculated under the Standard Commission Schedule above, on the total contract value.</p>`
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
  const party = (role: string, name: string, email: string): string => `
    <div class="party"><div class="role">${role}</div><div class="pname" dir="auto">${esc(name)}</div><div class="pline" dir="ltr">${esc(email)}</div></div>`
  return `<div class="agr">
  <div class="top"><img class="logo" src="${esc(v.logo)}" alt="Igani" /><span class="badge">${badge}</span></div>
  <h1>Sales Commission Agreement &amp; Payout Terms</h1>
  <p class="sub">Representative: ${esc(d.name.trim())} | Effective Date: ${esc(formatDate(d.effectiveDate))}</p>
  <div class="meta"><span>Reference: <b dir="ltr">${esc(v.reference)}</b></span><span>Effective: <b>${esc(formatDate(d.effectiveDate))}</b></span></div>
  <div class="parties">${party('Igani', v.admin.name, v.admin.email)}${party('Sales representative', d.name.trim(), d.email)}</div>
  ${agreementSectionsHtml(d)}
  <h2 class="sighead">Signatures</h2>
  <div class="sigs">${card('Igani', v.admin)}${card('Sales representative', v.rep, v.record ? `<tr><td>IP address</td><td dir="ltr">${esc(v.record.ip)}</td></tr>` : '')}</div>
  ${
    v.record
      ? `<div class="record"><div class="role" style="margin-bottom:6px">Signature record</div><table>
    <tr><td>Browser</td><td dir="ltr">${esc(v.record.browser)}</td></tr>
    <tr><td>Fingerprint (SHA-256)</td><td class="mono-hash" dir="ltr">${esc(v.record.sha256)}</td></tr>
  </table><div class="note" style="margin-top:6px">This agreement was signed electronically by both parties. Electronic signatures bind the parties. Igani does not keep a copy on its website.</div></div>`
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
