import { NextResponse } from 'next/server'
import { z } from 'zod'
import { currentUserOrNull } from '@/lib/auth'
import { canComplete, isVideoId } from '@/lib/video-core'
import { markCompleted, unlockedFor } from '@/lib/video-progress'

export const runtime = 'nodejs'

const Body = z.object({ duration: z.number().positive().max(60 * 60 * 6), watched: z.number().min(0).max(60 * 60 * 6) })

/** A salesperson reports that they finished a lesson. Counts only if it is unlocked and was opened. */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await props.params
  const user = await currentUserOrNull()
  if (!user) return NextResponse.json({ error: 'Sign in' }, { status: 401 })
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success || !isVideoId(id)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { ordered, progress, unlocked } = await unlockedFor(user.id)
  if (!unlocked.includes(id)) return NextResponse.json({ error: 'This video is still locked' }, { status: 403 })
  if (progress.completed.includes(id)) return NextResponse.json({ ok: true, already: true })
  if (!canComplete(progress.started[id], parsed.data.duration)) return NextResponse.json({ error: 'Play the video to the end to unlock the next one.' }, { status: 409 })
  await markCompleted(user.id, id, progress)
  const next = ordered[ordered.findIndex((v) => v.id === id) + 1]
  return NextResponse.json({ ok: true, nextId: next?.id ?? null })
}
