import { NextResponse } from 'next/server'
import { freshAccessToken, jobSecretOk } from '@/lib/tiktok'

export const dynamic = 'force-dynamic'

/** The reel job (owner's Mac): a fresh access token for Igani's TikTok account. Bearer TIKTOK_JOB_SECRET. */
export async function POST(req: Request): Promise<NextResponse> {
  if (!jobSecretOk(req.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const t = await freshAccessToken()
    if (!t) return NextResponse.json({ error: 'TikTok is not connected (or the connection expired): reconnect it in Admin → Settings' }, { status: 409 })
    return NextResponse.json(t, { headers: { 'cache-control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Token refresh failed' }, { status: 502 })
  }
}
