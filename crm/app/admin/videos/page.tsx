import { VideoManager } from '@/components/admin/VideoManager'
import { PageIntro } from '@/components/PageIntro'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { listVideos } from '@/lib/video'
import { courseOrder } from '@/lib/video-core'
import { allProgress } from '@/lib/video-progress'
import { SalesProgress } from '@/components/admin/SalesProgress'

export const metadata = { title: 'Videos' }
export const dynamic = 'force-dynamic'

/** Private videos (stored in a private Vercel Blob store, not on our site). Admin only. */
export default async function VideosPage(): Promise<React.ReactElement> {
  await requireUser(['ADMIN'])
  const [videos, offers, reps, progress] = await Promise.all([listVideos(), prisma.offer.findMany({ where: { status: { not: 'ARCHIVED' } }, select: { id: true, title: true, slug: true }, orderBy: { createdAt: 'desc' }, take: 200 }), prisma.user.findMany({ where: { role: 'SALES' }, select: { id: true, name: true, email: true }, orderBy: { createdAt: 'asc' } }), allProgress()])
  const courseIds = new Set(courseOrder(videos).map((v) => v.id))
  const rows = reps.map((r) => ({ userId: r.id, name: r.name ?? '', email: r.email ?? '', completed: (progress.get(r.id)?.completed ?? []).filter((id) => courseIds.has(id)).length }))
  return (
    <div className="space-y-5">
      <PageIntro title="Videos" hint="Private videos. Team videos play only for signed-in teammates; offer videos play only on that client's offer page. Nothing is public." />
      <SalesProgress rows={rows} total={courseIds.size} />
      <VideoManager videos={videos} offers={offers} />
    </div>
  )
}
