'use client'

import { useEffect, useState } from 'react'

const NOISE_SVG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>"

/**
 * Fixed film-grain layer for desktop screens. It is skipped on touch devices: at this strength it is invisible on a phone,
 * and a full-screen layer on top of the page costs a lot of scrolling smoothness there. No blend mode either, which would
 * force the whole page to be re-composited every frame.
 */
export function GrainOverlay() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    setShow(!window.matchMedia('(pointer: coarse)').matches)
  }, [])
  if (!show) return null
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] opacity-[0.05]"
      style={{ backgroundImage: `url("${NOISE_SVG}")`, backgroundSize: '160px 160px' }}
    />
  )
}
