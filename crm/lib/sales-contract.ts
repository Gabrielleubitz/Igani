import 'server-only'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb, type PDFFont } from 'pdf-lib'
import { visualOrder } from './bidi'
import { env } from './env'
import { htmlToPdf } from './pdf-render'
import { prisma } from './prisma'
import { agreementDocumentHtml, formatDate, type ContractData } from './sales-contract-core'
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

// ─── Signed PDF ─────────────────────────────────────────────────────────────

const FONT_DIR = join(process.cwd(), 'lib', 'fonts')
const NAVY = rgb(0.043, 0.106, 0.2)
const GREY = rgb(0.4, 0.45, 0.52)
const LINE = rgb(0.86, 0.88, 0.92)

const stamp = (d: Date): string => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', dateStyle: 'long', timeStyle: 'short' }).format(d) + ' (Israel time)'
export const sha256 = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex')
const pngBytes = (dataUrl: string): Uint8Array => Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64')

export interface SignInput {
  payload: LinkPayload
  signerName: string
  signature: string
  signedAt: Date
  ip: string
  userAgent: string
}

export async function buildSignedContractPdf(i: SignInput): Promise<{ pdf: Uint8Array; hash: string }> {
  const { data, admin, id } = i.payload
  const contract = await htmlToPdf(agreementDocumentHtml(data), { footer: `Igani · Sales commission agreement · ${data.name} · ${id.slice(0, 8).toUpperCase()}` })
  const hash = sha256(contract)
  const doc = await PDFDocument.load(contract, { ignoreEncryption: true })
  doc.registerFontkit(fontkit)
  const regular = await doc.embedFont(readFileSync(join(FONT_DIR, 'Heebo-Regular.ttf')), { subset: true })
  const bold = await doc.embedFont(readFileSync(join(FONT_DIR, 'Heebo-Bold.ttf')), { subset: true })
  const when = stamp(i.signedAt)
  const adminWhen = stamp(new Date(admin.signedAt))

  const originals = doc.getPages()
  originals.forEach((p, n) => {
    p.drawText(visualOrder(`Signed electronically by ${data.name} and Igani · ${when} · page ${n + 1} of ${originals.length + 1}`), { x: 24, y: 14, size: 7, font: regular, color: GREY })
  })

  const page = doc.addPage([595.28, 841.89])
  let y = 790
  const write = (text: string, o: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; x?: number } = {}): void => {
    page.drawText(visualOrder(text), { x: o.x ?? 56, y, size: o.size ?? 10.5, font: o.font ?? regular, color: o.color ?? NAVY })
  }
  const rule = (): void => page.drawLine({ start: { x: 56, y }, end: { x: 539, y }, thickness: 0.8, color: LINE })
  const row = (label: string, value: string): void => {
    write(label, { color: GREY, size: 9.5 })
    write(value, { x: 200 })
    y -= 18
  }
  const sig = async (dataUrl: string): Promise<void> => {
    const png = await doc.embedPng(pngBytes(dataUrl))
    const s = Math.min(220 / png.width, 80 / png.height)
    write('Signature', { color: GREY, size: 9.5 })
    page.drawImage(png, { x: 200, y: y - png.height * s + 10, width: png.width * s, height: png.height * s })
    y -= png.height * s + 10
    page.drawLine({ start: { x: 200, y }, end: { x: 420, y }, thickness: 0.8, color: GREY })
    y -= 28
  }

  write('Signature page', { size: 20, font: bold })
  y -= 22
  write(`Sales Commission Agreement · Effective ${formatDate(data.effectiveDate)}`, { size: 11, color: GREY })
  y -= 24
  rule()
  y -= 24

  write('On behalf of Igani', { font: bold })
  y -= 20
  row('Name', admin.name)
  row('Email', admin.email)
  row('Signed', adminWhen)
  await sig(admin.signature)
  y -= 6
  rule()
  y -= 24

  write('Sales representative', { font: bold })
  y -= 20
  row('Name', i.signerName)
  row('Email', data.email)
  row('Signed', when)
  row('IP address', i.ip)
  row('Browser', i.userAgent.slice(0, 70))
  await sig(i.signature)
  y -= 6
  rule()
  y -= 22

  write('Audit trail', { font: bold })
  y -= 20
  row('Link ID', id)
  row('Contract SHA-256', hash.slice(0, 32))
  page.drawText(hash.slice(32), { x: 200, y: y + 4, size: 10.5, font: regular, color: NAVY })
  y -= 26
  write('Both parties signed electronically: Igani when the signing link was created, the representative by typing their name,', { size: 8, color: GREY })
  y -= 11
  write('drawing their signature and accepting the agreement. The SHA-256 fingerprint identifies the exact agreement pages that were presented.', { size: 8, color: GREY })
  y -= 11
  write('This document was generated and emailed automatically; Igani does not keep a copy on its website.', { size: 8, color: GREY })

  return { pdf: await doc.save(), hash }
}
