import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { contractHtml } from '@/lib/contract-html'
import { htmlToPdf } from '@/lib/pdf-render'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Health check for the contract PDF engine (headless Chrome on Vercel). Secured by OFFER_STUDIO_TOKEN. */
export async function GET(req: Request): Promise<NextResponse> {
  const expected = process.env.OFFER_STUDIO_TOKEN ?? ''
  const got = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (expected.length < 32 || got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const t = Date.now()
  const html = contractHtml({
    lang: 'he',
    doc: { title: 'בדיקת מערכת', subtitle: 'PDF engine check', intro: 'בדיקה.', sections: [{ heading: 'סעיף', clauses: ['טקסט בעברית ו-English.'] }] },
    accent: '#2563eb',
    iganiLogo: null,
    clientLogo: null,
    igani: { name: 'Igani', signaturePng: null, signedAt: null },
    client: { name: 'Test', signaturePng: null, signedAt: null },
    fees: [{ name: 'Module', price: '₪1,000', billing: 'חד-פעמי' }],
    totals: { oneTime: '₪1,000', monthly: null, yearly: null },
    offerUrl: 'https://app.igani.co',
    reference: 'CHECK',
    date: new Date(),
    status: 'draft',
  })
  const pdf = await htmlToPdf(html)
  return NextResponse.json({ ok: true, bytes: pdf.byteLength, ms: Date.now() - t, header: Buffer.from(pdf.slice(0, 5)).toString() })
}
