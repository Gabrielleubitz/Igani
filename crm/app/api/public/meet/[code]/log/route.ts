import { NextResponse } from 'next/server'
import { z } from 'zod'
import { roomForPresence } from '@/lib/meet-presence'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({ t: z.string().max(100).nullable().optional(), kind: z.string().regex(/^[a-z-]{2,30}$/), data: z.record(z.string(), z.unknown()).optional() })

/** per room, per server instance: a broken client can't flood the logs */
const recent = new Map<string, { at: number; n: number }>()

/**
 * What happened on someone's call screen (joined, Jitsi errors, rejoins, why they left), written to the server log as
 * "[meet-client]" lines so a bad call can be diagnosed from Vercel. Only for people who may be in that room.
 */
export async function POST(req: Request, props: { params: Promise<{ code: string }> }): Promise<NextResponse> {
  const { code } = await props.params
  const raw = await req.text()
  if (raw.length > 4000) return NextResponse.json({ error: 'Too large' }, { status: 413 })
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  const parsed = Body.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  const room = await roomForPresence(code, parsed.data.t ?? null)
  if (!room) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const now = Date.now()
  const r = recent.get(room.id)
  if (r && now - r.at < 60_000 && r.n >= 60) return NextResponse.json({ ok: true })
  recent.set(room.id, r && now - r.at < 60_000 ? { at: r.at, n: r.n + 1 } : { at: now, n: 1 })
  const { kind, data = {} } = parsed.data
  const line = `[meet-client] room=${code.slice(0, 40)} ${kind} ${JSON.stringify(data).slice(0, 600)}`
  if (/error|fail|refused/.test(kind)) console.warn(line)
  else console.info(line)
  return NextResponse.json({ ok: true })
}
