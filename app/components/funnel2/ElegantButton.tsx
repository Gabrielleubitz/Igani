'use client'

import { MouseEvent, ReactNode, useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

type ElegantButtonProps = {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  tone?: 'ink' | 'ivory'
  className?: string
}

/** Hairline button that fills from the bottom on hover, with a gentle magnetic drift. */
export function ElegantButton({
  children,
  onClick,
  type = 'button',
  disabled,
  tone = 'ink',
  className = '',
}: ElegantButtonProps) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 180, damping: 20, mass: 0.8 })
  const sy = useSpring(y, { stiffness: 180, damping: 20, mass: 0.8 })

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el || disabled) return
    const r = el.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * 0.15)
    y.set((e.clientY - (r.top + r.height / 2)) * 0.15)
  }
  const onLeave = () => {
    x.set(0)
    y.set(0)
  }

  const colors =
    tone === 'ink'
      ? 'border-[#1F1C18] text-[#1F1C18] hover:text-[#F7F3EC] before:bg-[#1F1C18]'
      : 'border-[#F7F3EC]/70 text-[#F7F3EC] hover:text-[#1F1C18] before:bg-[#F7F3EC]'

  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} style={{ x: sx, y: sy }} className={`inline-block ${className}`}>
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`relative w-full overflow-hidden border px-10 py-4 text-[11px] font-medium uppercase tracking-[0.32em] transition-colors duration-500 ease-out before:absolute before:inset-0 before:origin-bottom before:scale-y-0 before:transition-transform before:duration-500 before:ease-[cubic-bezier(0.22,1,0.36,1)] hover:before:scale-y-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[#A9845A] disabled:opacity-60 ${colors}`}
      >
        <span className="relative">{children}</span>
      </button>
    </motion.div>
  )
}
