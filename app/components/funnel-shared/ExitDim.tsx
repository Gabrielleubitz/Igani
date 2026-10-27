'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useReducedMotionSafe } from './useReducedMotionSafe'

/**
 * Darkens its parent section as the next one slides over it, so the page
 * reads as stacked chapters with depth. Place as the last child of a
 * `relative` section.
 */
export function ExitDim({ max = 0.55 }: { max?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotionSafe()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['end end', 'end start'] })
  const opacity = useTransform(scrollYProgress, [0, 0.7], [0, max])

  return (
    <motion.div
      ref={ref}
      aria-hidden
      style={{ opacity: reduce ? 0 : opacity }}
      className="pointer-events-none absolute inset-0 z-[5] bg-[#01040b]"
    />
  )
}
