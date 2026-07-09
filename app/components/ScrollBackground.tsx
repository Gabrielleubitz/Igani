'use client'

import { ReactNode } from 'react'

interface ScrollBackgroundProps {
  /** High-resolution static background image (first frame of the sections video). */
  imageSrc: string
  children: ReactNode
  className?: string
}

/**
 * Sticky static image background for content sections below the hero.
 * Content scrolls over a fixed full-viewport image with legibility scrims.
 */
export default function ScrollBackground({
  imageSrc,
  children,
  className = '',
}: ScrollBackgroundProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="sticky top-0 h-screen -z-0 pointer-events-none" aria-hidden="true">
        <img
          src={imageSrc}
          alt=""
          decoding="async"
          fetchPriority="low"
          className="absolute inset-0 h-full w-full object-cover [transform:translateZ(0)]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#040d1a]/92 via-[#040d1a]/78 to-[#040d1a]/92" />
        <div className="absolute inset-0 bg-[#020810]/40" />
      </div>

      <div className="-mt-[100vh] relative z-10 pb-4">
        {children}
      </div>
    </div>
  )
}
