'use client'

import { ReactNode, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useReducedMotionSafe } from './useReducedMotionSafe'
import { ExitDim } from './ExitDim'

type SectionSheetProps = {
  id: string
  /** Stacking order: each later section must be higher so it slides over the one before. */
  layer: number
  /** Background / text colour classes for this section's surface. */
  className?: string
  /** Fill most of a screen and centre the content: one idea per screen. */
  fill?: boolean
  /** Darken this sheet as the next one covers it. */
  dimOnExit?: boolean
  children: ReactNode
}

/**
 * A section rendered as a rounded sheet that rides up over the previous one.
 * As it arrives it grows from 94% to full width and its top corners square
 * off when it reaches the top of the screen, so every section clearly lands.
 */
export function SectionSheet({ id, layer, className = '', fill = true, dimOnExit = false, children }: SectionSheetProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotionSafe()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start start'] })
  const scale = useTransform(scrollYProgress, [0, 0.7], [0.94, 1])
  const radius = useTransform(scrollYProgress, [0.75, 1], [40, 0])

  return (
    <motion.div
      ref={ref}
      id={id}
      style={
        reduce
          ? { zIndex: layer }
          : { zIndex: layer, scale, borderTopLeftRadius: radius, borderTopRightRadius: radius, transformOrigin: '50% 0%' }
      }
      className={`relative -mt-10 overflow-clip rounded-t-[40px] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.45)] ${
        fill ? 'flex min-h-[90svh] flex-col justify-center' : ''
      } ${className}`}
    >
      {children}
      {dimOnExit && <ExitDim />}
    </motion.div>
  )
}
