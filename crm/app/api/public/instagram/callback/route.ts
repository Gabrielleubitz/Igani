import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { currentUserOrNull } from '@/lib/auth'
import { connectInstagramWithCode } from '@/lib/instagram'

export const dynamic = 'force-dynamic'

/** Instagram sends the admin back here after they approve. Checks the session and the state, then stores the account. */
export async function GET(req: Request): Promise<NextResponse> {
  const back = (status: string): NextResponse => {
    const res = NextResponse.redirect(new URL(`/admin/settings?instagram=${status}#instagram`, req.url))
    res.cookies.delete({ name: 'instagram_oauth_state', path: '/api/public/instagram' })
    return res
  }
  const user = await currentUserOrNull()
  if (user?.role !== 'ADMIN') return back('forbidden')
  const url = new URL(req.url)
  if (url.searchParams.get('error')) return back('declined')
  // Instagram appends "#_" to the code in some flows
  const code = url.searchParams.get('code')?.replace(/#_$/, '')
  const state = url.searchParams.get('state')
  const want = (await cookies()).get('instagram_oauth_state')?.value
  if (!code || !state || !want || state !== want) return back('expired')
  try {
    await connectInstagramWithCode(code, user.id)
    return back('connected')
  } catch (e) {
    console.error('[instagram] connect failed', e instanceof Error ? e.message : e)
    return back('failed')
  }
}
