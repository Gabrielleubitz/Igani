'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConfidentialityGate } from '@/components/ConfidentialityGate'

/**
 * A course lesson. Reaching the end (watching or scrubbing forward) tells the server, which unlocks the next video.
 */
export function LessonPlayer({ id, title, completed, nextId, startAt = 0, confirm = true }: { id: string; title: string; completed: boolean; nextId: string | null; startAt?: number; confirm?: boolean }): React.ReactElement {
  const router = useRouter()
  const ref = useRef<HTMLVideoElement>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function finished(): Promise<void> {
    const v = ref.current
    if (!v || completed || done) return
    const res = await fetch(`/api/videos/${id}/complete`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ duration: v.duration, watched: v.duration }) })
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
        <ConfidentialityGate videoId={id} enabled={confirm}>
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
          onLoadedMetadata={(e) => {
            // A link from a call review opens the lesson at the minute that teaches the point
            if (startAt > 0 && startAt < e.currentTarget.duration) e.currentTarget.currentTime = startAt
          }}
          onEnded={() => void finished()}
        />
        </ConfidentialityGate>
        <figcaption className="bg-white px-4 py-2.5 text-sm font-medium text-slate-800">{title}</figcaption>
      </figure>
      {gated ? <p className="text-sm text-muted-foreground">Reach the end of this video to unlock the next one.</p> : null}
      {msg ? <p className={done ? 'text-sm text-emerald-500' : 'text-sm text-red-500'}>{msg}</p> : null}
    </div>
  )
}
