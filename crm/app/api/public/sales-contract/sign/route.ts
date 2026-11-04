import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendSalesContractSignedEmail } from '@/lib/email'
import { buildSignedContractPdf, claimLink, readContractLink, releaseLink } from '@/lib/sales-contract'
import { formatDate } from '@/lib/sales-contract-core'
import { REASON_TEXT, clientIp, limited } from '@/lib/sales-contract-http'
import { MAX_SIGNATURE_CHARS, PNG_DATA_URL } from '@/lib/sales-contract-token'

export const runtime = 'nodejs'
export const maxDuration = 60

const Body = z.object({
  token: z.string().min(20).max(400_000),
  name: z.string().trim().min(2).max(120),
  signature: z.string().max(MAX_SIGNATURE_CHARS).regex(PNG_DATA_URL),
  agree: z.literal(true),
})

/**
 * The representative signs. The dual-signed PDF is built in memory and emailed to them and to the admin who made the link;
 * the only thing remembered is a used-mark (link id + date) so the same link cannot be signed twice.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const ip = clientIp(req)
  if (limited(ip, 15)) return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    const f = parsed.error.issues[0]?.path[0]
    return NextResponse.json({ error: f === 'agree' ? 'Please accept the agreement.' : f === 'signature' ? 'Please draw your signature.' : f === 'name' ? 'Please type your full name.' : 'Invalid request' }, { status: 400 })
  }
  const body = parsed.data
  const r = await readContractLink(body.token)
  if (!r.ok) return NextResponse.json({ error: REASON_TEXT[r.reason] ?? REASON_TEXT.malformed }, { status: r.reason === 'used' ? 409 : 400 })
  const { payload } = r

  const signedAt = new Date()
  let built
  try {
    built = await buildSignedContractPdf({ payload, signerName: body.name, signature: body.signature, signedAt, ip, userAgent: req.headers.get('user-agent') ?? 'unknown' })
  } catch (err) {
    console.error('[sales-contract] could not build the PDF', err)
    return NextResponse.json({ error: 'We could not prepare the signed agreement. Please try again.' }, { status: 502 })
  }

  // Claim the link before sending, so two tabs cannot both succeed; give it back if the emails fail
  if (!(await claimLink(payload.id, signedAt))) return NextResponse.json({ error: REASON_TEXT.used }, { status: 409 })

  const when = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', dateStyle: 'long', timeStyle: 'short' }).format(signedAt)
  const common = { repName: payload.data.name, adminName: payload.admin.name, effectiveDate: formatDate(payload.data.effectiveDate), signedAt: when }
  const filename = `Igani-Sales-Commission-Agreement-${payload.data.name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'Representative'}.pdf`
  const attachment = { filename, content: Buffer.from(built.pdf) }
  const results = await Promise.allSettled([
    sendSalesContractSignedEmail(payload.data.email, { ...common, audience: 'rep' }, attachment),
    sendSalesContractSignedEmail(payload.admin.email, { ...common, audience: 'admin' }, attachment),
  ])
  if (results.every((x) => x.status === 'rejected')) {
    console.error('[sales-contract] both emails failed', results)
    await releaseLink(payload.id)
    return NextResponse.json({ error: 'We could not email the signed agreement. Nothing was recorded; please try again.' }, { status: 502 })
  }
  results.forEach((x) => x.status === 'rejected' && console.error('[sales-contract] one email failed', x.reason))
  return NextResponse.json({ ok: true, emailed: { rep: results[0].status === 'fulfilled', admin: results[1].status === 'fulfilled' } })
}
