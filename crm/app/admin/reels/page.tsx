import { PageIntro } from '@/components/PageIntro'
import { requireUser } from '@/lib/auth'
import { listReels } from '@/lib/reels'
import { instagramStatus } from '@/lib/instagram'
import { ReelQueue } from '@/components/admin/ReelQueue'

export const metadata = { title: 'Reels' }
export const dynamic = 'force-dynamic'

/** Reels from the twice-a-day job, waiting for a person to approve them for Instagram. Admin only. */
export default async function ReelsPage(): Promise<React.ReactElement> {
  await requireUser(['ADMIN'])
  const [reels, ig] = await Promise.all([listReels(), instagramStatus()])
  const fmt = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jerusalem' })
  const rows = reels.filter((r) => r.status !== 'uploading').map((r) => ({ id: r.id, title: r.title, caption: r.caption, status: r.status, createdAt: fmt.format(r.createdAt), permalink: r.permalink ?? null, error: r.error ?? null }))
  return (
    <div className="space-y-5">
      <PageIntro title="Reels" hint="Videos made by the reel job. Watch each one, adjust the caption, and approve it to post on Instagram. Nothing posts without your approval." />
      <ReelQueue reels={rows} instagramReady={ig.connected} />
    </div>
  )
}
