import { NextResponse } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { dialerDemo, identityFor, twilioConfig, voiceToken } from '@/lib/twilio'

export const dynamic = 'force-dynamic'

/** A short-lived Twilio Voice token for the signed-in user's browser (their own line only). */
export async function GET(): Promise<NextResponse> {
  const user = await currentUserOrNull()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SALES')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (dialerDemo()) return NextResponse.json({ demo: true }, { headers: { 'cache-control': 'no-store' } })
  const c = twilioConfig()
  if (!c) return NextResponse.json({ error: 'Calling is not set up yet.' }, { status: 503 })
  const line = await prisma.phoneLine.findUnique({ where: { userId: user.id } })
  // admins without a line still get a token, to listen in on calls (placing calls still needs a line: see the TwiML webhook)
  if (!line?.active && user.role !== 'ADMIN') return NextResponse.json({ error: 'You don’t have a phone line yet. Ask an admin.' }, { status: 403 })
  return NextResponse.json({ token: voiceToken(c, user.id), identity: identityFor(user.id), ttlSec: 3600 }, { headers: { 'cache-control': 'no-store' } })
}
