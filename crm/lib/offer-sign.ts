import 'server-only'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { visualOrder } from './bidi'

export interface SignedPdfInput {
  contract: Uint8Array
  offerTitle: string
  clientName: string
  offerUrl: string
  modules: { name: string; price: string }[]
  oneTimeTotal: string
  monthly: string | null
  signerName: string
  signerEmail: string
  signedAt: Date
  ip: string
  /** PNG data (the drawn signature) */
  signaturePng: Uint8Array
}

const FONT_DIR = join(process.cwd(), 'lib', 'fonts')
const NAVY = rgb(0.043, 0.106, 0.2)
const GREY = rgb(0.4, 0.45, 0.52)
const LINE = rgb(0.86, 0.88, 0.92)

export function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function stamp(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', dateStyle: 'long', timeStyle: 'short' }).format(d) + ' (Israel time)'
}

/** Appends a signature page and a "signed electronically" footer on every original page. Returns the new PDF. */
export async function buildSignedPdf(input: SignedPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.load(input.contract, { ignoreEncryption: true })
  doc.registerFontkit(fontkit)
  const regular = await doc.embedFont(readFileSync(join(FONT_DIR, 'Heebo-Regular.ttf')), { subset: true })
  const bold = await doc.embedFont(readFileSync(join(FONT_DIR, 'Heebo-Bold.ttf')), { subset: true })
  const hash = sha256(input.contract)
  const when = stamp(input.signedAt)

  const originals = doc.getPages()
  originals.forEach((p, i) => {
    const text = visualOrder(`Signed electronically by ${input.signerName} · ${when} · page ${i + 1} of ${originals.length}`)
    p.drawText(text, { x: 24, y: 14, size: 7, font: regular, color: GREY })
  })

  const page = doc.addPage([595.28, 841.89]) // A4
  let y = 790
  const write = (text: string, opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; x?: number } = {}): void => {
    const size = opts.size ?? 10.5
    page.drawText(visualOrder(text), { x: opts.x ?? 56, y, size, font: opts.font ?? regular, color: opts.color ?? NAVY })
  }
  const rule = (p: PDFPage): void => {
    p.drawLine({ start: { x: 56, y }, end: { x: 539, y }, thickness: 0.8, color: LINE })
  }
  const row = (label: string, value: string): void => {
    write(label, { color: GREY, size: 9.5 })
    write(value, { x: 200 })
    y -= 18
  }

  write('Signature page', { size: 20, font: bold })
  y -= 22
  write(input.offerTitle, { size: 12, color: GREY })
  y -= 26
  rule(page)
  y -= 22

  row('Client', input.clientName)
  row('Offer', input.offerUrl)
  y -= 6
  write('Modules', { font: bold })
  y -= 18
  for (const m of input.modules) {
    if (y < 260) break // keeps the signature block on this page; the full list is on the offer page
    write(m.name, { size: 10 })
    const w = regular.widthOfTextAtSize(m.price, 10)
    page.drawText(m.price, { x: 539 - w, y, size: 10, font: regular, color: NAVY })
    y -= 16
  }
  y -= 4
  rule(page)
  y -= 18
  write('One-time total', { font: bold })
  const tw = bold.widthOfTextAtSize(input.oneTimeTotal, 11)
  page.drawText(input.oneTimeTotal, { x: 539 - tw, y, size: 11, font: bold, color: NAVY })
  y -= 18
  if (input.monthly) {
    row('Monthly', input.monthly)
  }
  y -= 10
  rule(page)
  y -= 24

  row('Signed by', input.signerName)
  row('Email', input.signerEmail)
  row('Date', when)
  row('IP address', input.ip)
  row('Contract SHA-256', hash.slice(0, 32))
  page.drawText(hash.slice(32), { x: 200, y: y + 4, size: 10.5, font: regular, color: NAVY })
  y -= 30

  const png = await doc.embedPng(input.signaturePng)
  const scale = Math.min(220 / png.width, 90 / png.height)
  write('Signature', { color: GREY, size: 9.5 })
  page.drawImage(png, { x: 200, y: y - png.height * scale + 10, width: png.width * scale, height: png.height * scale })
  y -= png.height * scale + 10
  page.drawLine({ start: { x: 200, y }, end: { x: 420, y }, thickness: 0.8, color: GREY })
  y -= 40
  write('The client accepted this agreement online by typing their name, drawing their signature and ticking the acceptance box.', { size: 8, color: GREY })
  y -= 12
  write('The SHA-256 fingerprint identifies the exact contract file that was presented for signing.', { size: 8, color: GREY })

  return doc.save()
}
