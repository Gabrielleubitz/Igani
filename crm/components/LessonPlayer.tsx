'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * A course lesson. Until it has been completed once, the viewer cannot skip ahead of what they have already watched and
 * cannot speed it up; finishing it tells the server, which unlocks the next video.
 */
export function LessonPlayer({ id, title, completed, nextId }: { id: string; title: string; completed: boolean; nextId: string | null }): React.ReactElement {
  const router = useRouter()
  const ref = useRef<HTMLVideoElement>(null)
  const reached = useRef(0)
  const [msg, setMsg] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function finished(): Promise<void> {
    const v = ref.current
    if (!v || completed || done) return
    const res = await fetch(`/api/videos/${id}/complete`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ duration: v.duration, watched: reached.current }) })
    const j = (await res.json().catch(() => ({}))) as { error?: string }
    if (res.ok) {
      setDone(true)
      setMsg(nextId ? 'Completed. The next video is unlocked.' : 'Completed. You finished the whole course.')
      router.refresh()
    } else setMsg(j.error ?? 'Could not save your progress. Try again.')
  }

  const gated = !completed && !done
  return (
    <div className="space-y-3">
      <figure className="overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-slate-900/10">
        <video
          ref={ref}
          src={`/api/public/videos/${id}/stream`}
          controls
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          playsInline
          preload="metadata"
          aria-label={title}
          className="aspect-video w-full bg-black"
          onContextMenu={(e) => e.preventDefault()}
          onTimeUpdate={(e) => {
            const t = e.currentTarget.currentTime
            if (gated && !e.currentTarget.seeking && t <= reached.current + 1.5) reached.current = Math.max(reached.current, t)
          }}
          onSeeking={(e) => {
            if (gated && e.currentTarget.currentTime > reached.current + 1.5) e.currentTarget.currentTime = reached.current
          }}
          onRateChange={(e) => {
            if (gated && e.currentTarget.playbackRate !== 1) e.currentTarget.playbackRate = 1
          }}
          onEnded={() => void finished()}
        />
        <figcaption className="bg-white px-4 py-2.5 text-sm font-medium text-slate-800">{title}</figcaption>
      </figure>
      {gated ? <p className="text-sm text-muted-foreground">Watch this video to the end to unlock the next one. You can pause and resume, but not skip ahead.</p> : null}
      {msg ? <p className={done ? 'text-sm text-emerald-500' : 'text-sm text-red-500'}>{msg}</p> : null}
    </div>
  )
}
