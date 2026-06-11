'use client'

import {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

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
 * through the track is mapped 1:1 onto video.currentTime via a rAF loop
 * (with light smoothing so the scrub feels weighty rather than jittery).
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

  const targetProgress = useRef(0)
  const renderedProgress = useRef(-1)
  const duration = useRef(0)
  const rafId = useRef<number>(0)

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

  const readScrollProgress = useCallback(() => {
    const track = trackRef.current
    if (!track) return 0
    const rect = track.getBoundingClientRect()
    const scrollable = rect.height - window.innerHeight
    if (scrollable <= 0) return 0
    return Math.min(1, Math.max(0, -rect.top / scrollable))
  }, [])

  useEffect(() => {
    if (reducedMotion) {
      // Rest on the opening frame instead of wherever the scrub left off
      const video = videoRef.current
      if (video && video.readyState >= 1) video.currentTime = 0
      return
    }

    const video = videoRef.current
    if (!video) return

    const onMeta = () => {
      duration.current = video.duration || 0
    }
    video.addEventListener('loadedmetadata', onMeta)
    if (video.readyState >= 1) onMeta()

    // iOS won't decode frames for currentTime seeks until playback has been
    // "touched" once — a muted play()/pause() unlocks frame-accurate seeking.
    const unlock = () => {
      video.play().then(() => video.pause()).catch(() => {})
      window.removeEventListener('touchstart', unlock)
    }
    window.addEventListener('touchstart', unlock, { once: true, passive: true })

    const onScroll = () => {
      targetProgress.current = readScrollProgress()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    const tick = () => {
      const target = targetProgress.current
      const prev = renderedProgress.current
      // Smooth toward the target so fast flicks don't strobe the video
      const next = prev < 0 ? target : prev + (target - prev) * 0.18

      if (Math.abs(next - (prev < 0 ? -1 : prev)) > 0.0005) {
        renderedProgress.current = next

        if (duration.current > 0 && video.readyState >= 1) {
          // Hold a hair before the end so the last frame stays visible
          video.currentTime = next * Math.max(duration.current - 0.05, 0)
        }
        if (progressBarRef.current) {
          progressBarRef.current.style.transform = `scaleX(${next})`
        }
        if (startOverlayRef.current) {
          const o = 1 - Math.min(1, next / 0.3)
          startOverlayRef.current.style.opacity = o.toFixed(3)
          startOverlayRef.current.style.transform = `translateY(${next * -60}px)`
          startOverlayRef.current.style.pointerEvents = o > 0.4 ? 'auto' : 'none'
        }
        if (endOverlayRef.current) {
          const o = Math.min(1, Math.max(0, (next - 0.72) / 0.22))
          endOverlayRef.current.style.opacity = o.toFixed(3)
          endOverlayRef.current.style.transform = `translateY(${(1 - o) * 28}px)`
          endOverlayRef.current.style.pointerEvents = o > 0.6 ? 'auto' : 'none'
        }
      }
      rafId.current = requestAnimationFrame(tick)
    }
    rafId.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId.current)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('touchstart', unlock)
      video.removeEventListener('loadedmetadata', onMeta)
    }
  }, [reducedMotion, readScrollProgress])

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
          className="absolute inset-0 h-full w-full object-cover"
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
