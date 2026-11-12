import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { currentUserOrNull } from '@/lib/auth'
import { connectWithCode } from '@/lib/tiktok'

export const dynamic = 'force-dynamic'

/** TikTok sends the admin back here after they approve. Checks the session and the state, then stores the account. */
export async function GET(req: Request): Promise<NextResponse> {
  const back = (status: string): NextResponse => {
    const res = NextResponse.redirect(new URL(`/admin/settings?tiktok=${status}#tiktok`, req.url))
    res.cookies.delete({ name: 'tiktok_oauth_state', path: '/api/public/tiktok' })
    return res
  }
  const user = await currentUserOrNull()
  if (user?.role !== 'ADMIN') return back('forbidden')
  const url = new URL(req.url)
  const code = url.searchParams.get('code'), state = url.searchParams.get('state')
  if (url.searchParams.get('error')) return back('declined')
  const want = (await cookies()).get('tiktok_oauth_state')?.value
  if (!code || !state || !want || state !== want) return back('expired')
  try {
    await connectWithCode(code, user.id)
    return back('connected')
  } catch (e) {
    console.error('[tiktok] connect failed', e instanceof Error ? e.message : e)
    return back('failed')
  }
}
