import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkIn, checkOut, peopleInRoom, roomForPresence } from '@/lib/meet-presence'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const nope = (): NextResponse => NextResponse.json({ error: 'Not found' }, { status: 404 })

/** The lobby asks who's already in the call. Only for people who may join it. */
export async function GET(req: Request, props: { params: Promise<{ code: string }> }): Promise<NextResponse> {
  const { code } = await props.params
  const room = await roomForPresence(code, new URL(req.url).searchParams.get('t'))
  if (!room) return nope()
  return NextResponse.json({ people: await peopleInRoom(room.id) }, { headers: { 'Cache-Control': 'no-store' } })
}

const Body = z.object({ t: z.string().max(100).nullable().optional(), key: z.string().regex(/^[a-z0-9]{8,40}$/), name: z.string().trim().min(1).max(60), leaving: z.boolean().optional() })

/** A tab in the call checks in (every ~20s), or checks out when it leaves (sent as a beacon). */
export async function POST(req: Request, props: { params: Promise<{ code: string }> }): Promise<NextResponse> {
  const { code } = await props.params
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  const b = parsed.data
  const room = await roomForPresence(code, b.t ?? null)
  if (!room) return nope()
  if (b.leaving) await checkOut(room.id, b.key)
  else await checkIn(room.id, b.key, b.name, room.avatar)
  return NextResponse.json({ ok: true })
}
