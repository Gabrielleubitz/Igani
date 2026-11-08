import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendSalesContractSignedEmail } from '@/lib/email'
import { buildSignedContractPdf, claimLink, readContractLink, restoreLink, saveAcceptance, undoAcceptance } from '@/lib/sales-contract'
import { formatDate, namesMatch } from '@/lib/sales-contract-core'
import { REASON_TEXT, clientIp, limited } from '@/lib/sales-contract-http'
import { MAX_SIGNATURE_CHARS, PNG_DATA_URL } from '@/lib/sales-contract-token'

export const runtime = 'nodejs'
export const maxDuration = 60

const Body = z.object({
  code: z.string().length(12),
  name: z.string().trim().min(2).max(120),
  signature: z.string().max(MAX_SIGNATURE_CHARS).regex(PNG_DATA_URL),
  businessName: z.string().trim().min(2).max(120),
  businessNumber: z.string().trim().min(5).max(30).regex(/^[0-9A-Za-z][0-9A-Za-z\-/ ]*$/),
  agree: z.literal(true),
})

/**
 * The representative signs. The dual-signed PDF is built in memory and emailed to them and to the admin who made the link;
 * only a small record is kept (an AgreementAcceptance: who, which wording, when, IP, SHA-256, the figures: no PDF), and the link is deleted so it cannot be signed twice.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const ip = clientIp(req)
  if (limited(ip, 15)) return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    const f = parsed.error.issues[0]?.path[0]
    return NextResponse.json({ error: f === 'agree' ? 'Please accept the agreement.' : f === 'signature' ? 'Please draw your signature.' : f === 'name' ? 'Please type your full name.' : f === 'businessName' ? 'Please enter your registered business name.' : f === 'businessNumber' ? 'Please enter your business registration number (company, dealer or tax number).' : 'Invalid request' }, { status: 400 })
  }
  const body = parsed.data
  const r = await readContractLink(body.code)
  if (!r.ok) return NextResponse.json({ error: REASON_TEXT[r.reason] }, { status: 410 })
  const { payload } = r
  if (!namesMatch(body.name, payload.data.name)) return NextResponse.json({ error: `Please type your name exactly as written in the agreement: ${payload.data.name}` }, { status: 400 })

  const signedAt = new Date()
  const signInput = { payload, signerName: body.name, business: { name: body.businessName, number: body.businessNumber }, signature: body.signature, signedAt, ip, userAgent: req.headers.get('user-agent') ?? 'unknown' }
  let built
  try {
    built = await buildSignedContractPdf(signInput)
  } catch (err) {
    console.error('[sales-contract] could not build the PDF', err)
    return NextResponse.json({ error: 'We could not prepare the signed agreement. Please try again.' }, { status: 502 })
  }

  // Claim the link before sending, so two tabs cannot both succeed; give it back if the emails fail
  if (!(await claimLink(payload.id))) return NextResponse.json({ error: REASON_TEXT.invalid }, { status: 409 })

  // Keep the small signing record; if that fails, give the link back so nothing is lost
  try {
    await saveAcceptance(signInput, built)
  } catch (err) {
    console.error('[sales-contract] could not save the signed agreement', err)
    await restoreLink(payload)
    return NextResponse.json({ error: 'We could not save the signed agreement. Please try again.' }, { status: 502 })
  }

  const when = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', dateStyle: 'long', timeStyle: 'short' }).format(signedAt)
  const common = { repName: payload.data.name, adminName: payload.admin.name, effectiveDate: formatDate(payload.data.effectiveDate), signedAt: when }
  const filename = `Igani-Sales-Commission-Agreement-${payload.data.name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'Representative'}.pdf`
  const attachment = { filename, content: Buffer.from(built.pdf) }
  // The signed PDF is not stored anywhere: the emails are the only copies. Igani's copy must go out, or the signing is undone and the link given back.
  try {
    await sendSalesContractSignedEmail(payload.admin.email, { ...common, audience: 'admin' }, attachment)
  } catch (err) {
    console.error('[sales-contract] the Igani copy could not be emailed', err)
    await undoAcceptance(payload.data.email, signedAt)
    await restoreLink(payload)
    return NextResponse.json({ error: 'We could not email the signed agreement. Please try again.' }, { status: 502 })
  }
  let repEmailed = true
  try {
    await sendSalesContractSignedEmail(payload.data.email, { ...common, audience: 'rep' }, attachment)
  } catch (err) {
    repEmailed = false
    console.error('[sales-contract] the representative copy could not be emailed', err)
  }
  return NextResponse.json({ ok: true, emailed: { rep: repEmailed, admin: true } })
}
