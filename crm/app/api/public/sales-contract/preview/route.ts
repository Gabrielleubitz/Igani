import { NextResponse } from 'next/server'
import { z } from 'zod'
import { pendingView, readContractLink } from '@/lib/sales-contract'
import { agreementHtml } from '@/lib/sales-contract-core'
import { REASON_TEXT, clientIp, limited } from '@/lib/sales-contract-http'

export const runtime = 'nodejs'

const Body = z.object({ code: z.string().length(12) })

/** Verifies a signing link and returns the populated agreement. Stores nothing. */
export async function POST(req: Request): Promise<NextResponse> {
  if (limited(clientIp(req), 60)) return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: REASON_TEXT.invalid }, { status: 400 })
  const r = await readContractLink(parsed.data.code)
  if (!r.ok) return NextResponse.json({ error: REASON_TEXT[r.reason] }, { status: 410 })
  const { data, exp } = r.payload
  return NextResponse.json({ html: agreementHtml(data, pendingView(r.payload, '/igani-logo%202.png')), repName: data.name, expiresAt: new Date(exp * 1000).toISOString() })
}
