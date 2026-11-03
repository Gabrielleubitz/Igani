import 'server-only'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ContractDoc, ContractLang } from './contract'

/**
 * The contract as one self-contained HTML document (fonts and logos embedded), used for the admin preview, the client's
 * in-page viewer and, printed by headless Chrome, the PDF. Plain HTML/CSS on purpose: identical everywhere.
 */

export interface ContractParty {
  name: string
  company?: string | null
  title?: string | null
  email?: string | null
  phone?: string | null
}

export interface ContractRenderInput {
  lang: ContractLang
  doc: ContractDoc
  accent: string
  /** data: URLs */
  iganiLogo: string | null
  clientLogo: string | null
  igani: ContractParty & { signaturePng: string | null; signedAt: Date | null }
  client: ContractParty & { signaturePng: string | null; signedAt: Date | null }
  fees: { name: string; price: string; billing: string }[]
  totals: { oneTime: string; monthly: string | null; yearly: string | null }
  offerUrl: string
  reference: string
  date: Date
  /** Signature record (signed contracts only) */
  record?: { ip: string; contractSha256: string; signerEmail: string }
  status: 'draft' | 'approved' | 'signed'
}

const ROOT = process.cwd()
const b64 = (path: string): string => readFileSync(path).toString('base64')
let fontCss: string | null = null
function fonts(): string {
  fontCss ??= `@font-face{font-family:Heebo;font-weight:400;src:url(data:font/ttf;base64,${b64(join(ROOT, 'lib', 'fonts', 'Heebo-Regular.ttf'))}) format('truetype')}
@font-face{font-family:Heebo;font-weight:700;src:url(data:font/ttf;base64,${b64(join(ROOT, 'lib', 'fonts', 'Heebo-Bold.ttf'))}) format('truetype')}`
  return fontCss
}

/** A file under public/ as a data URL (logos), or null. */
export function publicFileDataUrl(publicPath: string | null | undefined): string | null {
  if (!publicPath) return null
  const clean = publicPath.split('?')[0]!.replace(/^\/+/, '')
  if (clean.includes('..')) return null
  const ext = clean.split('.').pop()?.toLowerCase()
  const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : null
  if (!mime) return null
  try {
    return `data:${mime};base64,${b64(join(ROOT, 'public', clean))}`
  } catch {
    return null
  }
}

/** Only embed real image data URLs (logos, signatures); anything else is dropped. */
const IMG_DATA = /^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/]+={0,2}$/
const img = (src: string | null | undefined, alt = ''): string => (src && IMG_DATA.test(src) ? `<img src="${src}" alt="${esc(alt)}" />` : '')

const esc = (s: string | null | undefined): string => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const L = {
  he: { between: 'בין', and: 'לבין', provider: 'נותן השירות', client: 'הלקוח', company: 'חברה', name: 'שם', title: 'תפקיד', email: 'אימייל', phone: 'טלפון', date: 'תאריך', signature: 'חתימה', toComplete: 'יושלם בעת החתימה', scheduleA: 'נספח א׳: תמורה', module: 'מודול', price: 'מחיר', billing: 'חיוב', oneTime: 'סה״כ חד-פעמי', monthly: 'חודשי', yearly: 'שנתי', vat: 'הסכומים אינם כוללים מע״מ, ככל שחל.', signatures: 'חתימות', reference: 'מספר', offer: 'ההצעה', record: 'רישום החתימה', ip: 'כתובת IP', hash: 'טביעת אצבע (SHA-256)', signedOn: 'נחתם', draft: 'טיוטה: לא לחתימה', approvedNote: 'מאושר לחתימה', pending: 'ממתין לחתימה', electronically: 'ההסכם נחתם באופן אלקטרוני. חתימה אלקטרונית מחייבת את הצדדים.' },
  en: { between: 'Between', and: 'and', provider: 'Provider', client: 'Client', company: 'Company', name: 'Name', title: 'Title', email: 'Email', phone: 'Phone', date: 'Date', signature: 'Signature', toComplete: 'Completed at signing', scheduleA: 'Schedule A: Fees', module: 'Module', price: 'Price', billing: 'Billing', oneTime: 'One-time total', monthly: 'Monthly', yearly: 'Yearly', vat: 'Amounts exclude VAT where applicable.', signatures: 'Signatures', reference: 'Reference', offer: 'Offer', record: 'Signature record', ip: 'IP address', hash: 'Fingerprint (SHA-256)', signedOn: 'Signed', draft: 'Draft: not for signature', approvedNote: 'Approved for signature', pending: 'Awaiting signature', electronically: 'This agreement was signed electronically. Electronic signatures bind the parties.' },
} as const

export function contractHtml(i: ContractRenderInput): string {
  const t = L[i.lang]
  const rtl = i.lang === 'he'
  const fmt = (d: Date | null): string => (d ? new Intl.DateTimeFormat(rtl ? 'he-IL' : 'en-GB', { timeZone: 'Asia/Jerusalem', dateStyle: 'long' }).format(d) : '')
  const fmtTime = (d: Date | null): string => (d ? new Intl.DateTimeFormat(rtl ? 'he-IL' : 'en-GB', { timeZone: 'Asia/Jerusalem', dateStyle: 'long', timeStyle: 'short' }).format(d) : '')
  const party = (role: string, p: ContractParty, placeholder: boolean): string => `
    <div class="party">
      <div class="role">${esc(role)}</div>
      <div class="pname">${esc(p.company || p.name)}</div>
      ${p.company && p.name ? `<div class="pline">${esc(p.name)}${p.title ? ` · ${esc(p.title)}` : ''}</div>` : ''}
      ${p.email ? `<div class="pline" dir="ltr">${esc(p.email)}</div>` : ''}
      ${p.phone ? `<div class="pline" dir="ltr">${esc(p.phone)}</div>` : ''}
      ${placeholder && !p.email ? `<div class="pline muted">${esc(t.toComplete)}</div>` : ''}
    </div>`
  const sigBox = (role: string, p: ContractParty & { signaturePng: string | null; signedAt: Date | null }): string => `
    <div class="sig">
      <div class="role">${esc(role)}</div>
      <div class="sigline">${img(p.signaturePng)}</div>
      <div class="siglabel">${esc(t.signature)}</div>
      <table class="sigtable">
        <tr><td>${esc(t.name)}</td><td>${esc(p.name) || '&nbsp;'}</td></tr>
        <tr><td>${esc(t.title)}</td><td>${esc(p.title) || '&nbsp;'}</td></tr>
        <tr><td>${esc(t.email)}</td><td dir="ltr">${esc(p.email) || '&nbsp;'}</td></tr>
        <tr><td>${esc(t.phone)}</td><td dir="ltr">${esc(p.phone) || '&nbsp;'}</td></tr>
        <tr><td>${esc(t.date)}</td><td>${esc(fmt(p.signedAt)) || '&nbsp;'}</td></tr>
      </table>
    </div>`

  const banner = i.status === 'draft' ? `<div class="banner draft">${esc(t.draft)}</div>` : ''
  const stamp = i.status === 'signed' ? t.signedOn : i.status === 'approved' ? t.pending : t.draft

  return `<!doctype html>
<html lang="${i.lang}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(i.doc.title)}</title>
<style>
${fonts()}
:root{--accent:${/^#[0-9a-f]{3,8}$/i.test(i.accent) ? i.accent : '#2563eb'};--ink:#0f172a;--muted:#64748b;--line:#e2e8f0}
*{box-sizing:border-box}
html,body{margin:0;background:#f1f5f9}
body{font-family:Heebo,Helvetica,Arial,sans-serif;color:var(--ink);font-size:10.5pt;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:800px;margin:24px auto;background:#fff;padding:44px 48px;border-radius:14px;box-shadow:0 20px 60px -30px rgba(15,23,42,.35)}
@media print{html,body{background:#fff}.page{margin:0;padding:0;max-width:none;box-shadow:none;border-radius:0}}
.top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:18px;border-bottom:2px solid var(--accent)}
.top img{height:34px;max-width:170px;object-fit:contain}
.top .mono{font-weight:700;font-size:15pt}
.badge{display:inline-block;font-size:8pt;font-weight:700;letter-spacing:${rtl ? '0' : '.12em'};text-transform:uppercase;color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,#fff);padding:3px 9px;border-radius:999px}
h1{font-size:21pt;line-height:1.2;margin:22px 0 4px;letter-spacing:-.01em}
.sub{color:var(--muted);font-size:11.5pt;margin:0}
.meta{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:12px;font-size:8.5pt;color:var(--muted)}
.meta b{color:var(--ink);font-weight:700}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:22px 0 8px}
.party{border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:#f8fafc}
.role{font-size:7.5pt;font-weight:700;letter-spacing:${rtl ? '0' : '.12em'};text-transform:uppercase;color:var(--muted)}
.pname{font-weight:700;font-size:12pt;margin-top:2px}
.pline{font-size:9pt;color:#334155}
.muted{color:var(--muted)}
.intro{margin:16px 0 6px}
h2{font-size:12pt;margin:20px 0 6px;display:flex;gap:8px;align-items:baseline;break-after:avoid}
h2 .n{color:var(--accent);font-variant-numeric:tabular-nums}
.clause{display:flex;gap:10px;margin:0 0 6px;text-align:justify}
.clause .n{color:var(--muted);font-size:9pt;min-width:26px;font-variant-numeric:tabular-nums;padding-top:1px}
.clause p{margin:0;flex:1}
.schedule{margin-top:24px;break-inside:avoid}
table.fees{width:100%;border-collapse:collapse;margin-top:8px;font-size:9.5pt}
table.fees th{text-align:start;font-size:7.5pt;letter-spacing:${rtl ? '0' : '.1em'};text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line);padding:6px 8px}
table.fees td{padding:7px 8px;border-bottom:1px solid #f1f5f9}
table.fees td.num,table.fees th.num{text-align:end;white-space:nowrap;font-variant-numeric:tabular-nums}
table.fees tr.total td{font-weight:700;border-top:2px solid var(--ink);border-bottom:none}
table.fees tr.rec td{color:#334155}
.note{font-size:8pt;color:var(--muted);margin-top:6px}
.sigs{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:26px;break-inside:avoid}
.sig{border:1px solid var(--line);border-radius:12px;padding:14px}
.sigline{height:70px;border-bottom:1px dashed #94a3b8;display:flex;align-items:flex-end;justify-content:center;margin-top:8px}
.sigline img{max-height:66px;max-width:100%;object-fit:contain}
.siglabel{font-size:7.5pt;color:var(--muted);margin:3px 0 8px}
.sigtable{width:100%;border-collapse:collapse;font-size:9pt}
.sigtable td{padding:3px 0;border-bottom:1px solid #f1f5f9}
.sigtable td:first-child{color:var(--muted);width:34%}
.record{margin-top:22px;border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:#f8fafc;font-size:8.5pt;break-inside:avoid}
.record table{border-collapse:collapse;width:100%}
.record td{padding:2px 0;vertical-align:top}
.record td:first-child{color:var(--muted);width:30%}
.mono-hash{font-family:ui-monospace,Menlo,monospace;font-size:7.5pt;word-break:break-all}
.banner{margin:-8px 0 18px;padding:8px 12px;border-radius:10px;font-size:9pt;font-weight:700;text-align:center}
.banner.draft{background:#fef3c7;color:#92400e}
</style>
</head>
<body>
<div class="page">
  ${banner}
  <div class="top">
    ${img(i.iganiLogo, 'Igani') || '<span class="mono">Igani</span>'}
    ${img(i.clientLogo, i.client.company || i.client.name) || `<span class="mono">${esc(i.client.company || i.client.name)}</span>`}
  </div>
  <div style="margin-top:20px"><span class="badge">${esc(stamp)}</span></div>
  <h1>${esc(i.doc.title)}</h1>
  ${i.doc.subtitle ? `<p class="sub">${esc(i.doc.subtitle)}</p>` : ''}
  <div class="meta">
    <span>${esc(t.reference)}: <b dir="ltr">${esc(i.reference)}</b></span>
    <span>${esc(t.date)}: <b>${esc(fmt(i.date))}</b></span>
    <span>${esc(t.offer)}: <b dir="ltr">${esc(i.offerUrl.replace(/^https?:\/\//, ''))}</b></span>
  </div>
  <div class="parties">
    ${party(t.provider, i.igani, false)}
    ${party(t.client, i.client, i.status !== 'signed')}
  </div>
  ${i.doc.intro ? `<p class="intro">${esc(i.doc.intro)}</p>` : ''}
  ${i.doc.sections
    .map(
      (s, n) => `<h2><span class="n">${n + 1}.</span>${esc(s.heading)}</h2>
  ${s.clauses.map((c, k) => `<div class="clause"><span class="n">${n + 1}.${k + 1}</span><p>${esc(c)}</p></div>`).join('')}`,
    )
    .join('')}
  <div class="schedule">
    <h2><span class="n">A.</span>${esc(t.scheduleA)}</h2>
    <table class="fees">
      <thead><tr><th>${esc(t.module)}</th><th>${esc(t.billing)}</th><th class="num">${esc(t.price)}</th></tr></thead>
      <tbody>
        ${i.fees.map((f) => `<tr><td>${esc(f.name)}</td><td>${esc(f.billing)}</td><td class="num">${esc(f.price)}</td></tr>`).join('')}
        <tr class="total"><td colspan="2">${esc(t.oneTime)}</td><td class="num">${esc(i.totals.oneTime)}</td></tr>
        ${i.totals.monthly ? `<tr class="rec"><td colspan="2">${esc(t.monthly)}</td><td class="num">${esc(i.totals.monthly)}</td></tr>` : ''}
        ${i.totals.yearly ? `<tr class="rec"><td colspan="2">${esc(t.yearly)}</td><td class="num">${esc(i.totals.yearly)}</td></tr>` : ''}
      </tbody>
    </table>
    <div class="note">${esc(t.vat)}</div>
  </div>
  <h2 style="margin-top:28px">${esc(t.signatures)}</h2>
  <div class="sigs">
    ${sigBox(t.provider, i.igani)}
    ${sigBox(t.client, i.client)}
  </div>
  ${
    i.record
      ? `<div class="record"><div class="role" style="margin-bottom:6px">${esc(t.record)}</div><table>
    <tr><td>${esc(t.signedOn)}</td><td>${esc(fmtTime(i.client.signedAt))}</td></tr>
    <tr><td>${esc(t.email)}</td><td dir="ltr">${esc(i.record.signerEmail)}</td></tr>
    <tr><td>${esc(t.ip)}</td><td dir="ltr">${esc(i.record.ip)}</td></tr>
    <tr><td>${esc(t.hash)}</td><td class="mono-hash" dir="ltr">${esc(i.record.contractSha256)}</td></tr>
  </table><div class="note">${esc(t.electronically)}</div></div>`
      : ''
  }
</div>
</body>
</html>`
}
