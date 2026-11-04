import 'server-only'
import { createHash } from 'node:crypto'
import { fonts, publicFileDataUrl } from './contract-html'
import { env } from './env'
import { htmlToPdf } from './pdf-render'
import { prisma } from './prisma'
import { AGREEMENT_CSS, agreementHtml, agreementSectionsHtml, type ContractData, type AgreementView } from './sales-contract-core'
import { createLinkToken, newLinkId, usedKey, verifyLinkToken, type LinkPayload, type LinkResult } from './sales-contract-token'

export const LINK_DAYS = 14

const key = (): string => env().INVITE_TOKEN_SECRET ?? env().NEXTAUTH_SECRET

export function createContractLink(data: ContractData, admin: { name: string; email: string; signature: string }, now = new Date()): { url: string; expiresAt: Date } {
  const exp = Math.floor(now.getTime() / 1000) + LINK_DAYS * 86_400
  const payload: LinkPayload = { id: newLinkId(), exp, data, admin: { ...admin, signedAt: now.toISOString() } }
  const base = env().NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  return { url: `${base}/sign/commission#${createLinkToken(payload, key())}`, expiresAt: new Date(exp * 1000) }
}

export async function readContractLink(token: string): Promise<(LinkResult & { used?: boolean }) | { ok: false; reason: 'used' }> {
  const r = verifyLinkToken(token, key())
  if (!r.ok) return r
  const used = await prisma.siteSetting.findUnique({ where: { key: usedKey(r.payload.id) } })
  if (used) return { ok: false, reason: 'used' }
  return r
}

/** Atomically marks a link used (unique key). Returns false if it was already used. */
export async function claimLink(id: string, at: Date): Promise<boolean> {
  try {
    await prisma.siteSetting.create({ data: { key: usedKey(id), value: { usedAt: at.toISOString() } } })
    return true
  } catch {
    return false
  }
}

export async function releaseLink(id: string): Promise<void> {
  await prisma.siteSetting.delete({ where: { key: usedKey(id) } }).catch(() => undefined)
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
    rep: { name: i.signerName, email: data.email, signature: i.signature, signedAt: stamp(i.signedAt) },
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
