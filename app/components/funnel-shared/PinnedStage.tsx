'use client'

import { ReactNode, useRef } from 'react'
import { MotionValue, motion, useScroll, useTransform } from 'framer-motion'
import { useReducedMotionSafe } from './useReducedMotionSafe'

/** Scroll window (0–1 of the pinned stretch) in which stat `i` of `count` counts up. */
export function statWindow(i: number, count: number): [number, number] {
  const span = 0.8 / count
  const start = 0.08 + i * span
  return [start, start + span * 0.85]
}

type PinnedStageProps = {
  /** How many extra screens of scrolling the stage stays pinned for. */
  screens?: number
  className?: string
  children: (progress: MotionValue<number>, pinned: boolean) => ReactNode
}

/**
 * Holds its content on screen while the visitor scrolls through it, handing
 * the children a 0–1 progress value to drive the reveal. With reduced motion
 * it renders unpinned with progress fixed at 1.
 */
export function PinnedStage({ screens = 1.5, className = '', children }: PinnedStageProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotionSafe()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const done = useTransform(scrollYProgress, () => 1)

  return (
    <div ref={ref} style={reduce ? undefined : { height: `${100 + screens * 100}svh` }}>
      <div className={`${reduce ? '' : 'sticky top-0 min-h-[100svh]'} flex flex-col justify-center ${className}`}>
        {reduce ? children(done, false) : children(scrollYProgress, true)}
      </div>
    </div>
  )
}

/** Number that counts from 0 to `to` across stat `i`'s scroll window. */
export function CountUp({ progress, i, count, to }: { progress: MotionValue<number>; i: number; count: number; to: number }) {
  const [a, b] = statWindow(i, count)
  const value = useTransform(progress, [a, b], [0, to], { clamp: true })
  const text = useTransform(value, (v) => Math.round(v).toString())
  return <motion.span className="tabular-nums">{text}</motion.span>
}

/** Opacity / lift for stat `i`: dim until its turn, then fully lit. */
export function useStatReveal(progress: MotionValue<number>, i: number, count: number) {
  const [a] = statWindow(i, count)
  const opacity = useTransform(progress, [a - 0.06, a + 0.04], [0.28, 1], { clamp: true })
  const y = useTransform(progress, [a - 0.06, a + 0.04], [16, 0], { clamp: true })
  return { opacity, y }
}
