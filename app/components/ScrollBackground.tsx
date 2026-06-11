'use client'

import {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

interface ScrollBackgroundProps {
  /**
   * Video source — should be encoded with dense keyframes for smooth scrubbing.
   * (ffmpeg: -g 4 -keyint_min 4 -sc_threshold 0)
   */
  videoSrc: string
  /** Poster image shown before video loads and for reduced-motion users. */
  poster?: string
  /** Content sections that scroll over the sticky video background. */
  children: ReactNode
  className?: string
}

/**
 * Scroll-scrubbed cinematic background for content sections.
 *
 * Works differently from ScrollHero: instead of a fixed-height track with
 * overlaid copy, this wraps actual content sections. The sticky video lives
 * at z-index -1 so every child section scrolls over it naturally.
 *
 * Pattern:
 *   <section ref={trackRef}>            ← track: height = video(100vh) + children
 *     <div sticky -z-10>video</div>     ← background plane
 *     <div -mt-[100vh] z-10>children</div>  ← content pulled up to overlap
 *   </section>
 *
 * Scrub progress is computed against the full track height so the video
 * plays linearly from the first section to the last.
 *
 * Respects prefers-reduced-motion: video freezes on frame 0.
 */
export default function ScrollBackground({
  videoSrc,
  poster,
  children,
  className = '',
}: ScrollBackgroundProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  const targetProgress = useRef(0)
  const renderedProgress = useRef(-1)
  const duration = useRef(0)
  const rafId = useRef<number>(0)

  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const readProgress = useCallback(() => {
    const track = trackRef.current
    if (!track) return 0
    const rect = track.getBoundingClientRect()
    // Progress 0 when track top aligns with viewport top,
    // 1 when track bottom aligns with viewport bottom.
    const scrollable = rect.height - window.innerHeight
    if (scrollable <= 0) return 0
    return Math.min(1, Math.max(0, -rect.top / scrollable))
  }, [])

  useEffect(() => {
    if (reducedMotion) {
      const video = videoRef.current
      if (video && video.readyState >= 1) video.currentTime = 0
      return
    }

    const video = videoRef.current
    if (!video) return

    const onMeta = () => { duration.current = video.duration || 0 }
    video.addEventListener('loadedmetadata', onMeta)
    if (video.readyState >= 1) onMeta()

    // iOS frame-seeking unlock
    const unlock = () => {
      video.play().then(() => video.pause()).catch(() => {})
      window.removeEventListener('touchstart', unlock)
    }
    window.addEventListener('touchstart', unlock, { once: true, passive: true })

    const onScroll = () => { targetProgress.current = readProgress() }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    const tick = () => {
      const target = targetProgress.current
      const prev = renderedProgress.current
      const next = prev < 0 ? target : prev + (target - prev) * 0.15

      if (Math.abs(next - (prev < 0 ? -1 : prev)) > 0.0005) {
        renderedProgress.current = next
        if (duration.current > 0 && video.readyState >= 1) {
          video.currentTime = next * Math.max(duration.current - 0.05, 0)
        }
        if (barRef.current) {
          barRef.current.style.transform = `scaleX(${next})`
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
  }, [reducedMotion, readProgress])

  return (
    <div ref={trackRef} className={`relative ${className}`}>
      {/* Sticky video plane sits behind content */}
      <div className="sticky top-0 h-screen -z-0 pointer-events-none" aria-hidden="true">
        <video
          ref={videoRef}
          src={videoSrc}
          poster={poster}
          muted
          playsInline
          preload="auto"
          tabIndex={-1}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Gradient scrims for legibility — dark enough for white text at all scroll positions */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#040d1a]/92 via-[#040d1a]/78 to-[#040d1a]/92" />
        <div className="absolute inset-0 bg-[#020810]/40" />

        {/* Scrub progress bar — electric blue to match logo */}
        {!reducedMotion && (
          <div className="absolute bottom-0 left-0 right-0 h-px bg-white/[0.06]">
            <div
              ref={barRef}
              className="h-full w-full origin-left bg-[#4080E0]"
              style={{ transform: 'scaleX(0)', willChange: 'transform' }}
            />
          </div>
        )}
      </div>

      {/* Content — pulled up to overlap the sticky video */}
      <div className="-mt-[100vh] relative z-10 pb-4">
        {children}
      </div>
    </div>
  )
}
