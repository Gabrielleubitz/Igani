import { requireUser } from '@/lib/auth'
import { getWorker, listReels, listRequests } from '@/lib/reels'
import { instagramStatus } from '@/lib/instagram'
import { tiktokStatus } from '@/lib/tiktok'
import { objectInfo, playUrl } from '@/lib/video'
import { ReelStudio, type StudioHeader, type StudioReel } from '@/components/admin/ReelStudio'

export const metadata = { title: 'Reels' }
export const dynamic = 'force-dynamic'

const TZ = 'Asia/Jerusalem'
const fmt = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ })
const ago = (ms: number): string => {
  const m = Math.round((Date.now() - ms) / 60000)
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`
}
/** The scheduled runs on the Mac: 11:45 and 18:45 Israel time. */
function nextRun(): string {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: 'numeric', hour12: false, timeZone: TZ }).formatToParts(now)
  const mins = Number(parts.find((p) => p.type === 'hour')?.value) * 60 + Number(parts.find((p) => p.type === 'minute')?.value)
  if (mins < 11 * 60 + 45) return 'Today at 11:45'
  if (mins < 18 * 60 + 45) return 'Today at 18:45'
  return 'Tomorrow at 11:45'
}

/** Reels from the reel maker: review, post to Instagram and TikTok, ask for new ones. Admin only. */
export default async function ReelsPage(): Promise<React.ReactElement> {
  await requireUser(['ADMIN'])
  const [reels, ig, tt, worker, requests] = await Promise.all([listReels(), instagramStatus(), tiktokStatus(), getWorker(), listRequests()])
  const shown = reels.filter((r) => r.status !== 'uploading')
  const covers = await Promise.all(shown.map(async (r) => (r.coverKey && (await objectInfo(r.coverKey).catch(() => null)) ? playUrl(r.coverKey, 'image/jpeg', 1800) : null)))
  const openCover = new Set(requests.filter((q) => q.kind === 'cover' && (q.state === 'queued' || q.state === 'working')).map((q) => q.reelId))
  const coverReq = new Map(requests.filter((q) => q.kind === 'cover' && (q.state === 'queued' || q.state === 'working')).map((q) => [q.reelId, q]))
  const rows: StudioReel[] = shown.map((r, i) => ({
    id: r.id, title: r.title, caption: r.caption, createdAt: fmt.format(r.createdAt), cover: covers[i] ?? null,
    ig: { status: r.status, permalink: r.permalink ?? null, error: r.status === 'failed' ? (r.error ?? null) : null },
    tiktok: r.tiktok ? { status: r.tiktok.status, privacy: r.tiktok.privacy, error: r.tiktok.error ?? null } : null,
    coverQueued: openCover.has(r.id),
    coverProgress: coverReq.has(r.id) ? { pct: coverReq.get(r.id)!.pct ?? 0, step: coverReq.get(r.id)!.step ?? (coverReq.get(r.id)!.state === 'queued' ? 'Waiting for your Mac' : 'Starting') } : null,
  }))
  const seen = worker.lastSeen
  const awake = seen !== null && Date.now() - seen < 10 * 60_000
  // during a run the Mac stops checking in; a run started under 3 hours ago still counts as working
  const working = worker.state === 'working' && worker.since !== null && Date.now() - worker.since < 3 * 3600_000
  const header: StudioHeader = {
    worker: working
      ? { label: 'Reel maker is working', tone: 'busy', detail: `${worker.message ?? 'Making a reel'} · since ${worker.since ? ago(worker.since) : 'a moment ago'}`, pct: worker.pct ?? null }
      : awake ? { label: 'Reel maker is ready', tone: 'ok', detail: `Your Mac checked in ${ago(seen!)}` }
      : { label: 'Reel maker is offline', tone: 'off', detail: seen ? `Last seen ${ago(seen)}. Your Mac is probably asleep; requests wait until it wakes.` : 'Not connected yet: the Mac checker isn’t running.' },
    nextRun: nextRun(),
    queue: requests.filter((q) => q.state !== 'done' || Date.now() - (q.doneAt ?? 0) < 6 * 3600_000).slice(0, 5).map((q) => ({
      id: q.id,
      label: q.kind === 'reel' ? (q.topic ? `New reel: ${q.topic}` : 'New reel (its pick)') : `New cover: ${shown.find((r) => r.id === q.reelId)?.title ?? 'a reel'}`,
      state: q.state, when: ago(q.doneAt ?? q.at), pct: q.state === 'done' ? 100 : (q.pct ?? 0), step: q.state === 'queued' ? 'Waiting for your Mac to pick it up' : q.state === 'failed' ? (q.message ?? 'Failed') : (q.step ?? q.message ?? null),
    })),
    instagram: ig.connected,
    tiktok: tt.connected,
  }
  return <ReelStudio reels={rows} header={header} />
}
