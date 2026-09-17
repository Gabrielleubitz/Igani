'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

type SideNoteProps = {
  children: ReactNode
  /** Where the little arrow points, relative to the text */
  arrow?: 'left' | 'right' | 'down' | 'up' | 'none'
  className?: string
}

/** A scribbled aside in the display serif — the kind of note a designer leaves in the margin. */
export function SideNote({ children, arrow = 'none', className = '' }: SideNoteProps) {
  const arrowEl =
    arrow === 'none' ? null : (
      <svg
        aria-hidden
        viewBox="0 0 48 32"
        className={`h-6 w-8 shrink-0 text-[#9ec0f5] ${
          arrow === 'right' ? '' : arrow === 'left' ? '-scale-x-100' : arrow === 'down' ? 'rotate-90' : '-rotate-90'
        }`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 22c10-9 22-13 40-9" />
        <path d="M36 7l8 6-9 5" />
      </svg>
    )

  return (
    <motion.span
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className={`inline-flex items-center gap-2 font-display text-[1.1rem] leading-tight text-[#b9cdf3] ${className}`}
    >
      {arrow === 'left' && arrowEl}
      <span>{children}</span>
      {arrow !== 'left' && arrowEl}
    </motion.span>
  )
}
