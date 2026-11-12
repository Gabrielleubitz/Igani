import { NextResponse } from 'next/server'
import { jobSecretOk } from '@/lib/tiktok'
import { getReel, updateReel } from '@/lib/reels'
import { objectInfo } from '@/lib/video'
import { prisma } from '@/lib/prisma'
import { pushTo } from '@/lib/push'

export const dynamic = 'force-dynamic'

/** The reel job: the upload finished. Confirms the file is there, queues the reel for approval and tells the admins. */
export async function POST(req: Request): Promise<NextResponse> {
  if (!jobSecretOk(req.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = (await req.json().catch(() => ({}))) as { id?: string }
  const reel = id ? await getReel(id) : null
  if (!reel) return NextResponse.json({ error: 'Unknown reel' }, { status: 404 })
  if (!(await objectInfo(reel.key))) return NextResponse.json({ error: 'The video was not uploaded' }, { status: 409 })
  await updateReel(reel.id, { status: 'pending' })
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
  await pushTo(admins.map((a) => a.id), 'leads', { title: 'New reel ready', body: `${reel.title}: watch it and approve it for Instagram`, thread: 'reels', category: 'LEAD', data: { url: '/admin/reels' } }, { everyKind: true })
  return NextResponse.json({ ok: true })
}
