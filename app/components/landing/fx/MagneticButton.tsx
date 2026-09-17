'use client'

import { MouseEvent, ReactNode, useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

type MagneticButtonProps = {
  children: ReactNode
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'ghost'
  className?: string
  strength?: number
}

/** Button that leans toward the cursor and snaps back with a spring. */
export function MagneticButton({
  children,
  href,
  onClick,
  variant = 'primary',
  className = '',
  strength = 0.35,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.6 })
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.6 })

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * strength)
    y.set((e.clientY - (r.top + r.height / 2)) * strength)
  }
  const onLeave = () => {
    x.set(0)
    y.set(0)
  }

  const base =
    'relative inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4080E0]'
  const styles =
    variant === 'primary'
      ? 'bg-white text-[#04101e] hover:bg-[#e6eefc] shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_12px_40px_-12px_rgba(64,128,224,0.9)]'
      : 'border border-white/20 bg-white/[0.04] text-white hover:border-white/40 hover:bg-white/[0.08] backdrop-blur-md'

  const inner = href ? (
    <a href={href} onClick={onClick} className={`${base} ${styles} ${className}`}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  )

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: sx, y: sy }}
      className="inline-block"
    >
      {inner}
    </motion.div>
  )
}
