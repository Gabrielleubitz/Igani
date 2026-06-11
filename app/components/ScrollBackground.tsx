'use client'

import {
  ReactNode,
  useCallback,
  useRef,
  useState,
  useEffect,
} from 'react'
import { useScrollVideoScrub } from '@/hooks/useScrollVideoScrub'

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
 * The sticky video lives at z-index -1 so every child section scrolls over it.
 * Scrub progress is mapped 1:1 to scroll position through the full track height.
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

  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const onProgress = useCallback((progress: number) => {
    if (barRef.current) {
      barRef.current.style.transform = `scaleX(${progress})`
    }
  }, [])

  useScrollVideoScrub({
    trackRef,
    videoRef,
    reducedMotion,
    onProgress: reducedMotion ? undefined : onProgress,
  })

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
          className="absolute inset-0 h-full w-full object-cover [transform:translateZ(0)]"
        />
        {/* Gradient scrims for legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#040d1a]/92 via-[#040d1a]/78 to-[#040d1a]/92" />
        <div className="absolute inset-0 bg-[#020810]/40" />

        {/* Scrub progress bar */}
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
