import { CheckCircle2, Lock, PlayCircle } from 'lucide-react'
import Link from 'next/link'
import { LessonPlayer } from '@/components/LessonPlayer'
import { PageIntro } from '@/components/PageIntro'
import { PrivateVideo } from '@/components/PrivateVideo'
import { requireUser } from '@/lib/auth'
import { listVideos } from '@/lib/video'
import { courseOrder } from '@/lib/video-core'
import { unlockedFor } from '@/lib/video-progress'

export const metadata = { title: 'Videos' }
export const dynamic = 'force-dynamic'

/** Admins and marketing see every team video. Salespeople get the course: one video at a time, each unlocked by finishing the one before. */
export default async function TeamVideosPage(props: { searchParams: Promise<{ v?: string }> }): Promise<React.ReactElement> {
  const user = await requireUser()
  if (user.role !== 'SALES') {
    const videos = courseOrder(await listVideos())
    return (
      <div className="space-y-5">
        <PageIntro title="Videos" hint="Internal videos for the team. They only play while you are signed in. Salespeople see them one at a time, in order." />
        {videos.length === 0 ? <p className="text-sm text-muted-foreground">No videos yet.</p> : null}
        <div className="grid gap-5 lg:grid-cols-2">
          {videos.map((v) => (
            <PrivateVideo key={v.id} id={v.id} title={v.title} />
          ))}
        </div>
      </div>
    )
  }

  const { v } = await props.searchParams
  const { ordered, progress, unlocked } = await unlockedFor(user.id)
  if (ordered.length === 0) return <div className="space-y-5"><PageIntro title="Videos" hint="Your training course." /><p className="text-sm text-muted-foreground">No videos yet.</p></div>

  const visible = ordered.filter((o) => unlocked.includes(o.id))
  const firstOpen = ordered.find((o) => !progress.completed.includes(o.id))
  const active = visible.find((o) => o.id === v) ?? firstOpen ?? visible[visible.length - 1]!
  const doneCount = ordered.filter((o) => progress.completed.includes(o.id)).length
  const locked = ordered.length - visible.length
  const next = ordered[ordered.findIndex((o) => o.id === active.id) + 1]

  return (
    <div className="space-y-5">
      <PageIntro title="Videos" hint={`Your training course: ${doneCount} of ${ordered.length} completed. Finish a video to unlock the next one.`} />
      <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${(doneCount / ordered.length) * 100}%` }} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <LessonPlayer key={active.id} id={active.id} title={active.title} completed={progress.completed.includes(active.id)} nextId={next?.id ?? null} />
        <aside className="space-y-2">
          {visible.map((o) => {
            const finished = progress.completed.includes(o.id)
            return (
              <Link key={o.id} href={`/sales/videos?v=${o.id}`} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${o.id === active.id ? 'border-primary bg-primary/10 font-medium' : 'border-border hover:bg-muted'}`}>
                {finished ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden /> : <PlayCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
                <span className="truncate">{o.title}</span>
              </Link>
            )
          })}
          {locked > 0 ? (
            <p className="flex items-center gap-2 px-1 pt-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" aria-hidden /> {locked} more {locked === 1 ? 'video unlocks' : 'videos unlock'} as you finish
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
