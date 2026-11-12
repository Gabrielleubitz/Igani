import { NextResponse } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { disconnectInstagram } from '@/lib/instagram'

export const dynamic = 'force-dynamic'

export async function POST(): Promise<NextResponse> {
  const user = await currentUserOrNull()
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await disconnectInstagram()
  return NextResponse.json({ ok: true })
}
