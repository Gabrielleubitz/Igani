'use client'

import { MouseEvent, ReactNode, useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

type GlowButtonProps = {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
  strength?: number
}

/** Magnetic CTA with an electric cyan→violet glow that blooms on hover. */
export function GlowButton({
  children,
  onClick,
  type = 'button',
  disabled,
  className = '',
  strength = 0.3,
}: GlowButtonProps) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.6 })
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.6 })

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el || disabled) return
    const r = el.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * strength)
    y.set((e.clientY - (r.top + r.height / 2)) * strength)
  }
  const onLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: sx, y: sy }}
      className={`group/glow relative inline-block ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF] opacity-40 blur-lg transition-opacity duration-300 group-hover/glow:opacity-100"
      />
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className="relative w-full rounded-full border border-white/20 bg-[#0A0A0C] px-8 py-4 font-mono text-sm font-medium uppercase tracking-[0.2em] text-white transition-colors duration-300 hover:bg-[#111118] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00F0FF] disabled:opacity-60"
      >
        [ {children} ]
      </button>
    </motion.div>
  )
}
