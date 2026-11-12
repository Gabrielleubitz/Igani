import { NextResponse } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { disconnectTikTok } from '@/lib/tiktok'

export const dynamic = 'force-dynamic'

/** Admins: forget the TikTok account (the job stops being able to upload). */
export async function POST(): Promise<NextResponse> {
  const user = await currentUserOrNull()
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await disconnectTikTok()
  return NextResponse.json({ ok: true })
}
