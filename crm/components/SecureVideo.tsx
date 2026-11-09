'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** A link is refreshed before it can run out (the server issues 30-minute links). */
const REFRESH_AFTER_MS = 25 * 60_000
/** If the picture has been waiting this long, try a fresh link. */
const STALL_MS = 8_000

/**
 * A private video. It asks the server once for a direct link (one access check), then plays straight from the bucket, so playback
 * doesn't wait on our server for every piece of the file. If the link expires, errors, or playback stalls for a while, it gets a fresh
 * link and carries on from the same second.
 */
export function SecureVideo({ id, offerSlug, title, className = '', startAt = 0, onEnded, videoRef }: { id: string; offerSlug?: string; title: string; className?: string; startAt?: number; onEnded?: () => void; videoRef?: React.RefObject<HTMLVideoElement | null> }): React.ReactElement {
  const own = useRef<HTMLVideoElement>(null)
  const ref = videoRef ?? own
  const [src, setSrc] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const issuedAt = useRef(0)
  const resumeAt = useRef(startAt)
  const wasPlaying = useRef(false)
  const stallTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const failures = useRef(0)

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`/api/videos/${id}/link${offerSlug ? `?o=${encodeURIComponent(offerSlug)}` : ''}`, { cache: 'no-store' })
      const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!res.ok || !j.url) {
        setNote(res.status === 403 ? 'Confirm the notice first, then the video loads.' : res.status === 404 ? 'This video is not available.' : 'The video could not be loaded.')
        if (res.status >= 500 && failures.current++ < 3) setTimeout(() => void load(), 3000)
        return
      }
      failures.current = 0
      issuedAt.current = Date.now()
      setNote(null)
      setSrc(j.url)
    } catch {
      setNote('Connection problem, retrying…')
      if (failures.current++ < 3) setTimeout(() => void load(), 3000)
    }
  }, [id, offerSlug])

  useEffect(() => {
    void load()
    return () => {
      if (stallTimer.current) clearTimeout(stallTimer.current)
    }
  }, [load])

  /** A fresh link, remembering where we were so the viewer doesn't lose their place. */
  function refresh(): void {
    const v = ref.current
    if (v) {
      resumeAt.current = v.currentTime
      wasPlaying.current = !v.paused
    }
    setNote('Slow connection, reloading the video…')
    void load()
  }

  function clearStall(): void {
    if (stallTimer.current) clearTimeout(stallTimer.current)
    stallTimer.current = null
  }

  return (
    <>
      <video
        ref={ref}
        src={src ?? undefined}
        controls
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        playsInline
        preload="metadata"
        aria-label={title}
        className={className}
        onContextMenu={(e) => e.preventDefault()}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget
          if (resumeAt.current > 0 && resumeAt.current < v.duration) v.currentTime = resumeAt.current
          resumeAt.current = 0
          if (wasPlaying.current) void v.play().catch(() => undefined)
          wasPlaying.current = false
        }}
        onWaiting={() => {
          clearStall()
          stallTimer.current = setTimeout(() => {
            // Still waiting: a link that is getting old is the usual reason, so renew it
            if (Date.now() - issuedAt.current > REFRESH_AFTER_MS || (ref.current?.networkState === 3)) refresh()
            else setNote('Slow connection… the video is buffering.')
          }, STALL_MS)
        }}
        onPlaying={() => {
          clearStall()
          setNote(null)
        }}
        onCanPlay={() => {
          clearStall()
          setNote(null)
        }}
        onError={() => {
          clearStall()
          if (failures.current++ < 3) refresh()
          else setNote('The video could not be played. Reload the page to try again.')
        }}
        onEnded={onEnded}
      />
      {note ? <p className="bg-slate-900 px-4 py-2 text-xs text-slate-200" role="status">{note}</p> : null}
    </>
  )
}
