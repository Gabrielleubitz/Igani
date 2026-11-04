import { NextResponse } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { dialerDemo, twilioConfig } from '@/lib/twilio'

export const dynamic = 'force-dynamic'

/** Can the signed-in user use the dialer, and from which number? (Read by the dialer mounted in the root layout.) */
export async function GET(): Promise<NextResponse> {
  const headers = { 'cache-control': 'no-store' }
  const user = await currentUserOrNull()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SALES')) return NextResponse.json({ enabled: false }, { headers })
  if (dialerDemo()) return NextResponse.json({ enabled: true, demo: true, number: null }, { headers })
  if (!twilioConfig()) return NextResponse.json({ enabled: false }, { headers })
  const line = await prisma.phoneLine.findUnique({ where: { userId: user.id }, select: { number: true, active: true } })
  return NextResponse.json(line?.active ? { enabled: true, demo: false, number: line.number } : { enabled: false }, { headers })
}
