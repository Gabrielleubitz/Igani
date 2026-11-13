import { NextResponse } from 'next/server'
import { jobSecretOk } from '@/lib/tiktok'
import { finishRequest, getReel, progressRequest, setWorker, takeRequest } from '@/lib/reels'

export const dynamic = 'force-dynamic'

/**
 * The reel maker on the Mac. Bearer TIKTOK_JOB_SECRET.
 *   { action: 'poll' }                         → the next request from the Reels page (or none); records that the Mac is awake
 *   { action: 'state', state, message }        → idle / working (shown at the top of the Reels page)
 *   { action: 'done', id, ok, message }        → a request finished
 */
export async function POST(req: Request): Promise<NextResponse> {
  if (!jobSecretOk(req.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = (await req.json().catch(() => ({}))) as { action?: string; state?: 'idle' | 'working'; message?: string; id?: string; ok?: boolean; pct?: number; step?: string }
  if (b.action === 'poll') {
    await setWorker({})
    const r = await takeRequest()
    if (!r) return NextResponse.json({ request: null })
    const reel = r.reelId ? await getReel(r.reelId) : null
    return NextResponse.json({ request: { id: r.id, kind: r.kind, topic: r.topic ?? null, reel: reel ? { id: reel.id, title: reel.title, story: reel.story ?? null, file: reel.file ?? null } : null } })
  }
  if (b.action === 'state' && (b.state === 'idle' || b.state === 'working')) {
    await setWorker({ state: b.state, message: b.message?.slice(0, 200) ?? null, pct: b.state === 'idle' ? null : 0 })
    return NextResponse.json({ ok: true })
  }
  if (b.action === 'progress' && typeof b.pct === 'number') {
    if (b.id) await progressRequest(b.id, b.pct, b.step ?? null)
    await setWorker({ state: 'working', message: b.step?.slice(0, 200) ?? null, pct: Math.min(99, Math.round(b.pct)) })
    return NextResponse.json({ ok: true })
  }
  if (b.action === 'done' && b.id) {
    await finishRequest(b.id, Boolean(b.ok), b.message ?? null)
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
