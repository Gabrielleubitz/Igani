import { PageIntro } from '@/components/PageIntro'
import { requireUser } from '@/lib/auth'
import { listReels } from '@/lib/reels'
import { instagramStatus } from '@/lib/instagram'
import { tiktokStatus } from '@/lib/tiktok'
import { objectInfo, playUrl } from '@/lib/video'
import { ReelQueue } from '@/components/admin/ReelQueue'

export const metadata = { title: 'Reels' }
export const dynamic = 'force-dynamic'

/** Reels from the twice-a-day job, waiting for a person to approve them for Instagram. Admin only. */
export default async function ReelsPage(): Promise<React.ReactElement> {
  await requireUser(['ADMIN'])
  const [reels, ig, tt] = await Promise.all([listReels(), instagramStatus(), tiktokStatus()])
  const fmt = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jerusalem' })
  const shown = reels.filter((r) => r.status !== 'uploading')
  // a 30-minute private link to each reel's cover (when the job uploaded one)
  const covers = await Promise.all(shown.map(async (r) => (r.coverKey && (await objectInfo(r.coverKey).catch(() => null)) ? playUrl(r.coverKey, 'image/jpeg', 1800) : null)))
  const rows = shown.map((r, i) => ({ cover: covers[i] ?? null, id: r.id, title: r.title, caption: r.caption, status: r.status, createdAt: fmt.format(r.createdAt), permalink: r.permalink ?? null, error: r.error ?? null, tiktok: r.tiktok ? { status: r.tiktok.status, privacy: r.tiktok.privacy, error: r.tiktok.error ?? null } : null }))
  return (
    <div className="space-y-5">
      <PageIntro title="Reels" hint="Videos made by the reel job. Watch each one, adjust the caption, and post it to Instagram and TikTok. Nothing posts without your approval." />
      <ReelQueue reels={rows} instagramReady={ig.connected} tiktokReady={tt.connected} />
    </div>
  )
}
