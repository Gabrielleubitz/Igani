'use client'

import {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useScrollVideoScrub } from '@/hooks/useScrollVideoScrub'

interface ScrollHeroProps {
  /** Video source, e.g. /hero.mp4 */
  videoSrc: string
  /** Optional poster shown before metadata loads & for reduced-motion users */
  poster?: string
  /** Scroll track height on desktop, in vh (the sticky stage is always 100vh) */
  heightVh?: number
  /** Scroll track height on small screens, in vh */
  mobileHeightVh?: number
  /** Overlay shown at the start of the scrub (fades out as you scroll) */
  overlayStart?: ReactNode
  /** Overlay revealed near the end of the scrub (fades in) */
  overlayEnd?: ReactNode
  className?: string
}

/**
 * Apple-style scroll-scrubbed hero.
 *
 * A tall scroll track wraps a sticky full-viewport stage. Scroll progress
 * through the track is mapped 1:1 onto video.currentTime (no easing).
 *
 * Respects prefers-reduced-motion: the track collapses to one viewport and
 * the video stays on its first frame (or poster) with no scrubbing.
 */
export default function ScrollHero({
  videoSrc,
  poster,
  heightVh = 300,
  mobileHeightVh = 220,
  overlayStart,
  overlayEnd,
  className = '',
}: ScrollHeroProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const startOverlayRef = useRef<HTMLDivElement>(null)
  const endOverlayRef = useRef<HTMLDivElement>(null)

  const [reducedMotion, setReducedMotion] = useState(false)
  const [isSmallScreen, setIsSmallScreen] = useState(false)

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sizeQuery = window.matchMedia('(max-width: 640px)')
    const onMotion = () => setReducedMotion(motionQuery.matches)
    const onSize = () => setIsSmallScreen(sizeQuery.matches)
    onMotion()
    onSize()
    motionQuery.addEventListener('change', onMotion)
    sizeQuery.addEventListener('change', onSize)
    return () => {
      motionQuery.removeEventListener('change', onMotion)
      sizeQuery.removeEventListener('change', onSize)
    }
  }, [])

  const onProgress = useCallback((progress: number) => {
    if (progressBarRef.current) {
      progressBarRef.current.style.transform = `scaleX(${progress})`
    }
    if (startOverlayRef.current) {
      const o = 1 - Math.min(1, progress / 0.3)
      startOverlayRef.current.style.opacity = o.toFixed(3)
      startOverlayRef.current.style.transform = `translate3d(0, ${progress * -60}px, 0)`
      startOverlayRef.current.style.pointerEvents = o > 0.4 ? 'auto' : 'none'
    }
    if (endOverlayRef.current) {
      const o = Math.min(1, Math.max(0, (progress - 0.72) / 0.22))
      endOverlayRef.current.style.opacity = o.toFixed(3)
      endOverlayRef.current.style.transform = `translate3d(0, ${(1 - o) * 28}px, 0)`
      endOverlayRef.current.style.pointerEvents = o > 0.6 ? 'auto' : 'none'
    }
  }, [])

  useScrollVideoScrub({
    trackRef,
    videoRef,
    reducedMotion,
    onProgress: reducedMotion ? undefined : onProgress,
  })

  const trackHeight = reducedMotion
    ? '100vh'
    : `${isSmallScreen ? mobileHeightVh : heightVh}vh`

  return (
    <section
      ref={trackRef}
      className={`relative ${className}`}
      style={{ height: trackHeight }}
      aria-label="IGANI — from idea to launch"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={videoSrc}
          poster={poster}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          className="absolute inset-0 h-full w-full object-cover [transform:translateZ(0)]"
        />

        {/* Legibility scrims */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/70" />
        <div className="absolute inset-0 bg-black/20" />

        {/* Start overlay — headline + CTAs */}
        <div
          ref={startOverlayRef}
          className="absolute inset-0 flex items-center justify-center px-4"
          style={reducedMotion ? undefined : { willChange: 'opacity, transform' }}
        >
          {overlayStart}
        </div>

        {/* End overlay — closing line, hidden for reduced motion */}
        {!reducedMotion && (
          <div
            ref={endOverlayRef}
            className="absolute inset-0 flex items-center justify-center px-4"
            style={{ opacity: 0, pointerEvents: 'none', willChange: 'opacity, transform' }}
          >
            {overlayEnd}
          </div>
        )}

        {/* Scroll hint */}
        {!reducedMotion && (
          <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50">
            <span className="text-[11px] font-medium uppercase tracking-[0.25em]">Scroll</span>
            <span className="block h-8 w-px overflow-hidden bg-white/20">
              <span className="block h-3 w-px animate-scroll-hint bg-[#4080E0]" />
            </span>
          </div>
        )}

        {/* Scrub progress bar */}
        {!reducedMotion && (
          <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10">
            <div
              ref={progressBarRef}
              className="h-full w-full origin-left bg-[#4080E0]"
              style={{ transform: 'scaleX(0)', willChange: 'transform' }}
            />
          </div>
        )}
      </div>
    </section>
  )
}
