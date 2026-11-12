import { NextResponse } from 'next/server'
import { jobSecretOk } from '@/lib/tiktok'
import { getReel, updateReel } from '@/lib/reels'
import { objectInfo } from '@/lib/video'
import { prisma } from '@/lib/prisma'
import { pushLater } from '@/lib/push'

export const dynamic = 'force-dynamic'

/** Gives up on a slow step with a clear name instead of hanging the job. */
function within<T>(p: Promise<T>, ms: number, step: string): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${step} timed out`)), ms))])
}

/** The reel job: the upload finished. Confirms the file is there, queues the reel for approval and tells the admins. */
export async function POST(req: Request): Promise<NextResponse> {
  if (!jobSecretOk(req.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = (await req.json().catch(() => ({}))) as { id?: string }
    const reel = id ? await within(getReel(id), 10_000, 'reading the queue') : null
    if (!reel) return NextResponse.json({ error: 'Unknown reel' }, { status: 404 })
    if (!(await within(objectInfo(reel.key), 15_000, 'checking the upload'))) return NextResponse.json({ error: 'The video was not uploaded' }, { status: 409 })
    await within(updateReel(reel.id, { status: 'pending' }), 10_000, 'saving the queue')
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
    pushLater(admins.map((a) => a.id), 'leads', { title: 'New reel ready', body: `${reel.title}: watch it and approve it for Instagram`, thread: 'reels', category: 'LEAD', data: { url: '/admin/reels' } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[reels] ready failed', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 })
  }
}
