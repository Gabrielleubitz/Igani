import { VideoManager } from '@/components/admin/VideoManager'
import { PageIntro } from '@/components/PageIntro'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { listVideos } from '@/lib/video'

export const metadata = { title: 'Videos' }
export const dynamic = 'force-dynamic'

/** Private videos (stored in a private Vercel Blob store, not on our site). Admin only. */
export default async function VideosPage(): Promise<React.ReactElement> {
  await requireUser(['ADMIN'])
  const [videos, offers] = await Promise.all([listVideos(), prisma.offer.findMany({ where: { status: { not: 'ARCHIVED' } }, select: { id: true, title: true, slug: true }, orderBy: { createdAt: 'desc' }, take: 200 })])
  return (
    <div className="space-y-5">
      <PageIntro title="Videos" hint="Private videos. Team videos play only for signed-in teammates; offer videos play only on that client's offer page. Nothing is public." />
      <VideoManager videos={videos} offers={offers} />
    </div>
  )
}
