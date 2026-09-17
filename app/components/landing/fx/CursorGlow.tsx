'use client'

import { useEffect, useRef } from 'react'

/** Soft brand-blue glow that trails the pointer. Disabled on touch + reduced motion. */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(pointer: coarse)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let tx = window.innerWidth / 2
    let ty = window.innerHeight / 2
    let x = tx
    let y = ty
    let raf = 0
    let visible = false

    const onMove = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
      if (!visible) {
        visible = true
        el.style.opacity = '1'
      }
    }
    const onLeave = () => {
      visible = false
      el.style.opacity = '0'
    }

    const tick = () => {
      x += (tx - x) * 0.12
      y += (ty - y) * 0.12
      el.style.transform = `translate3d(${x - 260}px, ${y - 260}px, 0)`
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[1] h-[520px] w-[520px] rounded-full opacity-0 transition-opacity duration-500"
      style={{
        background:
          'radial-gradient(circle, rgba(64,128,224,0.16) 0%, rgba(64,128,224,0.06) 35%, transparent 70%)',
        willChange: 'transform',
      }}
    />
  )
}
