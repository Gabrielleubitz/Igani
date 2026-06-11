'use client'

import { RefObject, useEffect, useRef } from 'react'

/** Scroll progress 0–1 through a tall track (sticky stage = 100vh). */
export function readTrackScrollProgress(track: HTMLElement): number {
  const rect = track.getBoundingClientRect()
  const scrollable = rect.height - window.innerHeight
  if (scrollable <= 0) return 0
  return Math.min(1, Math.max(0, -rect.top / scrollable))
}

type UseScrollVideoScrubOptions = {
  trackRef: RefObject<HTMLElement | null>
  videoRef: RefObject<HTMLVideoElement | null>
  reducedMotion: boolean
  /** Called each animation frame with the current scrub progress (0–1). */
  onProgress?: (progress: number) => void
}

const END_BUFFER_SEC = 0.034 // keep last frame visible (~1 frame @ 30fps)
const SEEK_EPSILON_SEC = 0.001 // skip redundant decoder seeks

/**
 * Maps scroll position 1:1 onto video.currentTime — no easing/lerp.
 * RAF runs while scrolling and briefly after stop; seeks only when time changes.
 */
export function useScrollVideoScrub({
  trackRef,
  videoRef,
  reducedMotion,
  onProgress,
}: UseScrollVideoScrubOptions) {
  const onProgressRef = useRef(onProgress)
  onProgressRef.current = onProgress

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (reducedMotion) {
      if (video.readyState >= 1) video.currentTime = 0
      return
    }

    let duration = 0
    let lastSeekTime = -1
    let lastProgress = -1
    let rafId = 0
    let ticking = false
    let idleFrames = 0

    const onMeta = () => {
      duration = video.duration || 0
    }
    video.addEventListener('loadedmetadata', onMeta)
    if (video.readyState >= 1) onMeta()

    // iOS: unlock frame-accurate seeking after first touch
    const unlock = () => {
      video.play().then(() => video.pause()).catch(() => {})
      window.removeEventListener('touchstart', unlock)
    }
    window.addEventListener('touchstart', unlock, { once: true, passive: true })

    video.pause()

    const applyProgress = (progress: number) => {
      if (duration > 0 && video.readyState >= 1) {
        const time = progress * Math.max(duration - END_BUFFER_SEC, 0)
        if (lastSeekTime < 0 || Math.abs(time - lastSeekTime) >= SEEK_EPSILON_SEC) {
          video.currentTime = time
          lastSeekTime = time
        }
      }
      onProgressRef.current?.(progress)
    }

    const frame = () => {
      ticking = false
      const track = trackRef.current
      if (!track || !videoRef.current) return

      const progress = readTrackScrollProgress(track)
      applyProgress(progress)

      const settled =
        lastProgress >= 0 && Math.abs(progress - lastProgress) < 0.00008
      lastProgress = progress

      if (settled) {
        idleFrames += 1
        if (idleFrames < 4) scheduleFrame()
      } else {
        idleFrames = 0
        scheduleFrame()
      }
    }

    const scheduleFrame = () => {
      if (ticking) return
      ticking = true
      rafId = requestAnimationFrame(frame)
    }

    const onScroll = () => {
      idleFrames = 0
      scheduleFrame()
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', onScroll, { passive: true })
    window.addEventListener('touchmove', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId)
        ticking = false
      } else {
        onScroll()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    onScroll()

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', onScroll)
      window.removeEventListener('touchmove', onScroll)
      window.removeEventListener('resize', onScroll)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('touchstart', unlock)
      video.removeEventListener('loadedmetadata', onMeta)
    }
  }, [trackRef, videoRef, reducedMotion])
}
