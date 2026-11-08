import 'server-only'
import { createHash } from 'node:crypto'
import { fonts, publicFileDataUrl } from './contract-html'
import type { Prisma } from '@prisma/client'
import { env } from './env'
import { htmlToPdf } from './pdf-render'
import { prisma } from './prisma'
import { AGREEMENT_CSS, CONTRACT_VERSION, agreementHtml, agreementSectionsHtml, type ContractData, type AgreementView } from './sales-contract-core'
import { LINK_HOURS, LINK_PREFIX, isLinkCode, linkKey, newLinkCode, parseLink, type LinkPayload } from './sales-contract-token'

const asJson = (v: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue

/**
 * Keeps the agreement in the system under a short code until it is signed or 12 hours pass, then it is deleted.
 * Expired rows are purged here, whenever a new link is made.
 */
export async function createContractLink(data: ContractData, admin: { name: string; email: string; signature: string }, now = new Date()): Promise<{ url: string; expiresAt: Date }> {
  // One open contract per person: sending a new one to this person replaces only THEIR earlier unsigned link, never anyone else's
  await deletePendingFor(data.email, now)
  await prisma.siteSetting.deleteMany({ where: { key: { startsWith: LINK_PREFIX }, updatedAt: { lt: new Date(now.getTime() - (LINK_HOURS + 1) * 3_600_000) } } })
  const code = newLinkCode()
  const exp = Math.floor(now.getTime() / 1000) + LINK_HOURS * 3600
  const record = { exp, data, admin: { ...admin, signedAt: now.toISOString() } }
  await prisma.siteSetting.create({ data: { key: linkKey(code), value: asJson(record) } })
  const base = env().NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  return { url: `${base}/sign/${code}`, expiresAt: new Date(exp * 1000) }
}

export const linkUrl = (code: string): string => `${env().NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/sign/${code}`

export interface PendingLink { code: string; url: string; expiresAt: Date; email: string; name: string }

/** Every unsigned, unexpired contract link, with who it is for. */
export async function listPendingLinks(now = new Date()): Promise<PendingLink[]> {
  const rows = await prisma.siteSetting.findMany({ where: { key: { startsWith: LINK_PREFIX } }, select: { key: true, value: true } })
  const out: PendingLink[] = []
  for (const row of rows) {
    const code = row.key.slice(LINK_PREFIX.length)
    if (!isLinkCode(code)) continue
    const r = parseLink(code, row.value, now)
    if (r.ok) out.push({ code, url: linkUrl(code), expiresAt: new Date(r.payload.exp * 1000), email: r.payload.data.email.trim().toLowerCase(), name: r.payload.data.name })
  }
  return out
}

export async function pendingLinkFor(email: string, now = new Date()): Promise<PendingLink | null> {
  const mine = (await listPendingLinks(now)).filter((l) => l.email === email.trim().toLowerCase())
  return mine.sort((a, b) => b.expiresAt.getTime() - a.expiresAt.getTime())[0] ?? null
}

/** Removes this person's unsigned links (so a new one replaces them). */
export async function deletePendingFor(email: string, now = new Date()): Promise<void> {
  const mine = (await listPendingLinks(now)).filter((l) => l.email === email.trim().toLowerCase())
  if (mine.length) await prisma.siteSetting.deleteMany({ where: { key: { in: mine.map((l) => linkKey(l.code)) } } })
}

export type ReadResult = { ok: true; payload: LinkPayload } | { ok: false; reason: 'invalid' | 'expired' }

export async function readContractLink(code: string): Promise<ReadResult> {
  if (!isLinkCode(code)) return { ok: false, reason: 'invalid' }
  const row = await prisma.siteSetting.findUnique({ where: { key: linkKey(code) } })
  if (!row) return { ok: false, reason: 'invalid' }
  const r = parseLink(code, row.value)
  if (!r.ok && r.reason === 'expired') await prisma.siteSetting.deleteMany({ where: { key: linkKey(code) } })
  return r
}

/** Takes the link for signing by deleting it: only one caller can win. */
export async function claimLink(code: string): Promise<boolean> {
  const { count } = await prisma.siteSetting.deleteMany({ where: { key: linkKey(code) } })
  return count === 1
}

/** Puts a claimed link back (both emails failed) with its original expiry so the signer can retry. */
export async function restoreLink(p: LinkPayload): Promise<void> {
  const { id, ...record } = p
  await prisma.siteSetting.create({ data: { key: linkKey(id), value: asJson(record) } }).catch(() => undefined)
}

// ─── Branded views and signed PDF ───────────────────────────────────────────

/** Israel-time stamp used on the page and in the PDF */
export const stamp = (d: Date): string => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', dateStyle: 'long', timeStyle: 'short' }).format(d) + ' (Israel time)'
export const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex')
export const shortRef = (id: string): string => id.slice(0, 8).toUpperCase()

/** What the representative sees before signing: Igani already signed, their card still empty. */
export function pendingView(p: LinkPayload, logo: string): AgreementView {
  return {
    logo,
    status: 'pending',
    reference: shortRef(p.id),
    admin: { name: p.admin.name, email: p.admin.email, signature: p.admin.signature, signedAt: stamp(new Date(p.admin.signedAt)) },
    rep: { name: p.data.name, email: p.data.email, signature: null, signedAt: null },
  }
}

export interface SignInput {
  payload: LinkPayload
  signerName: string
  /** The representative's registered business, given at signing */
  business: { name: string; number: string }
  signature: string
  signedAt: Date
  ip: string
  userAgent: string
}

/** One branded, Chrome-rendered document (same look as offer contracts) including both signatures and the record. */
export async function buildSignedContractPdf(i: SignInput): Promise<{ pdf: Uint8Array; hash: string }> {
  const { data, id } = i.payload
  const hash = sha256(agreementSectionsHtml(data))
  const view: AgreementView = {
    ...pendingView(i.payload, publicFileDataUrl('/igani-logo 2.png') ?? ''),
    status: 'signed',
    rep: { name: i.signerName, email: data.email, signature: i.signature, signedAt: stamp(i.signedAt), business: i.business },
    record: { ip: i.ip, browser: i.userAgent.slice(0, 90), sha256: hash },
  }
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Sales commission agreement</title><style>
${fonts()}
html,body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
${AGREEMENT_CSS}
</style></head><body>${agreementHtml(data, view)}</body></html>`
  const pdf = await htmlToPdf(html, { footer: `Igani · Signed by ${i.signerName} and ${i.payload.admin.name} · ${stamp(i.signedAt)} · ${shortRef(id)}` })
  return { pdf, hash }
}

/** Keeps the signed agreement: who signed what wording, when, from where, with the signed PDF. */
export async function saveAcceptance(i: SignInput, built: { pdf: Uint8Array; hash: string }): Promise<string> {
  const email = i.payload.data.email.trim().toLowerCase()
  const f = i.payload.data.figures
  const [row] = await prisma.$transaction([
    prisma.agreementAcceptance.create({
      data: {
      email,
      version: CONTRACT_VERSION,
      sha256: built.hash,
      terms: asJson({ figures: i.payload.data.figures, terms: i.payload.data.terms, effectiveDate: i.payload.data.effectiveDate, representative: { businessName: i.business.name, businessNumber: i.business.number } }),
      signerName: i.signerName,
      adminName: i.payload.admin.name,
      adminEmail: i.payload.admin.email,
      ip: i.ip,
      userAgent: i.userAgent.slice(0, 300),
      pdf: Buffer.from(built.pdf),
      signedAt: i.signedAt,
      },
      select: { id: true },
    }),
    // The figures in the signed agreement become the salesperson's commission terms (and are locked from then on)
    prisma.allowedUser.updateMany({
      where: { email: { equals: email, mode: 'insensitive' } },
      data: { commissionTerms: asJson({ baseRatePct: f.basePercent, threshold: f.threshold, incrementSize: f.increment, bonusPerIncrement: f.bonus }) },
    }),
  ])
  return row.id
}
