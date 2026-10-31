'use client'

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef } from 'react'

/**
 * A full-bleed site capture for the before/after slider, pinned to the top of the page.
 * With a `video` (a recording of the live site) it plays that, muted and looping while
 * on screen, with the still `src` as its poster and as the fallback for reduced motion.
 */
export function Screenshot({ src, mobileSrc, video, alt }: { src: string; mobileSrc?: string; video?: string; alt: string }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = ref.current
    if (!v || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {})
        else v.pause()
      },
      { threshold: 0.25 }
    )
    io.observe(v)
    return () => io.disconnect()
  }, [video])

  if (video) {
    return (
      <video
        ref={ref}
        src={video}
        poster={src}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={alt}
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-top"
      />
    )
  }

  return (
    <picture>
      {mobileSrc && <source media="(max-width: 639px)" srcSet={mobileSrc} />}
      <img src={src} alt={alt} draggable={false} className="absolute inset-0 h-full w-full select-none object-cover object-top" />
    </picture>
  )
}
