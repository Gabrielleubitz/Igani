'use client'

import { useEffect, useRef } from 'react'
import { mountHeroCube } from '@/lib/hero-cube-core'

/**
 * Interactive 3×3 cube for the hero. The engine lives in lib/hero-cube-core.ts (shared with the static home page).
 */
export function HeroCube({ palette = 0, className = '' }: { palette?: number; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const paletteRef = useRef(palette)

  useEffect(() => {
    paletteRef.current = palette
  }, [palette])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    return mountHeroCube(host, () => paletteRef.current)
  }, [])

  return <div ref={hostRef} className={`relative h-full w-full ${className}`} role="img" aria-label="Interactive 3D cube. Drag to turn it." />
}
