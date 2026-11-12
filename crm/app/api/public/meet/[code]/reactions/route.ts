import { NextResponse } from 'next/server'
import { z } from 'zod'
import { roomForPresence } from '@/lib/meet-presence'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** The emoji the call's reaction bar offers (anything else is refused). */
const MEET_REACTIONS = ['💖', '👍', '🎉', '👏', '😂', '😮', '😢', '🤔'] as const

const nope = (): NextResponse => NextResponse.json({ error: 'Not found' }, { status: 404 })
const KEEP_MS = 2 * 60_000

/** Reactions in this call since `since` (ms). Polled every ~1.5 s by each tab in the call. */
export async function GET(req: Request, props: { params: Promise<{ code: string }> }): Promise<NextResponse> {
  const { code } = await props.params
  const q = new URL(req.url).searchParams
  const room = await roomForPresence(code, q.get('t'))
  if (!room) return nope()
  const now = Date.now()
  const since = Math.max(now - 30_000, Number(q.get('since')) || 0)
  const rows = await prisma.meetReaction.findMany({ where: { roomId: room.id, createdAt: { gt: new Date(since) } }, orderBy: { createdAt: 'asc' }, take: 60, select: { id: true, key: true, name: true, emoji: true, createdAt: true } })
  return NextResponse.json({ now, reactions: rows.map((r) => ({ id: r.id, key: r.key, name: r.name, emoji: r.emoji, at: r.createdAt.getTime() })) }, { headers: { 'Cache-Control': 'no-store' } })
}

const Body = z.object({
  t: z.string().max(100).nullable().optional(),
  id: z.string().regex(/^[a-z0-9]{8,40}$/),
  key: z.string().regex(/^[a-z0-9]{8,40}$/),
  name: z.string().trim().min(1).max(60),
  emoji: z.enum(MEET_REACTIONS),
})

/** A tab in the call sends a reaction. */
export async function POST(req: Request, props: { params: Promise<{ code: string }> }): Promise<NextResponse> {
  const { code } = await props.params
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  const b = parsed.data
  const room = await roomForPresence(code, b.t ?? null)
  if (!room) return nope()
  // a burst guard: at most 10 reactions per tab in 5 seconds
  const recent = await prisma.meetReaction.count({ where: { roomId: room.id, key: b.key, createdAt: { gt: new Date(Date.now() - 5000) } } })
  if (recent >= 10) return NextResponse.json({ error: 'Slow down' }, { status: 429 })
  await prisma.meetReaction.createMany({ data: [{ id: b.id, roomId: room.id, key: b.key, name: b.name, emoji: b.emoji }], skipDuplicates: true })
  await prisma.meetReaction.deleteMany({ where: { roomId: room.id, createdAt: { lt: new Date(Date.now() - KEEP_MS) } } })
  return NextResponse.json({ ok: true })
}
