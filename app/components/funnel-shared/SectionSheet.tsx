'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useReducedMotionSafe } from './useReducedMotionSafe'

type SectionSheetProps = {
  id: string
  /** Stacking order: each later section must be higher so it slides over the one before. */
  layer: number
  /** Background / text colour classes for this section's surface. */
  className?: string
  /** Fill most of a screen and centre the content: one idea per screen. */
  fill?: boolean
  /**
   * Hold this sheet's last screen in place once it's been read, so the next
   * sheet visibly slides over a still image instead of both scrolling away.
   * Also finishes the arrival higher up the screen, where the eye is.
   */
  hold?: boolean
  /** Darken whatever is under this sheet as it arrives (pair with `hold` on the one before). */
  veilPrevious?: boolean
  children: ReactNode
}

/**
 * Measures an element's height so it can be held with
 * `top: min(0px, 100svh - height)` — its last screen pinned to the bottom of
 * the viewport. Uses the small viewport unit rather than window.innerHeight,
 * so mobile toolbars showing/hiding never shift a held section.
 */
export function useHeight(ref: React.RefObject<HTMLElement>, enabled: boolean) {
  const [height, setHeight] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!enabled || !el) return
    const measure = () => setHeight(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, enabled])
  return height
}

const holdTop = (height: number) => `min(0px, calc(100svh - ${height}px))`

/**
 * A section rendered as a rounded sheet that rides up over the previous one.
 * As it arrives it grows from 94% to full width and its top corners square
 * off as it lands, so every section clearly starts.
 */
export function SectionSheet({
  id,
  layer,
  className = '',
  fill = true,
  hold = false,
  veilPrevious = false,
  children,
}: SectionSheetProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotionSafe()
  const holding = hold && !reduce
  const height = useHeight(ref, holding)
  const { scrollYProgress } = useScroll({ target: ref, offset: hold ? ['start end', 'start 0.35'] : ['start end', 'start start'] })
  const scale = useTransform(scrollYProgress, hold ? [0, 1] : [0, 0.7], [0.94, 1])
  const radius = useTransform(scrollYProgress, hold ? [0.55, 1] : [0.75, 1], [40, 0])
  const veil = useTransform(scrollYProgress, [0, 1], [0, 0.7])

  const sheet = (
    <div
      ref={ref}
      id={id}
      data-hold-sheet={hold ? '' : undefined}
      style={{ zIndex: layer, ...(holding ? { position: 'sticky', top: holdTop(height) } : {}) }}
      className={`relative ${holding ? '' : '-mt-10'}`}
    >
      {veilPrevious && !reduce && (
        <motion.div
          aria-hidden
          style={{ opacity: veil }}
          className="pointer-events-none absolute inset-x-0 bottom-full h-[100svh] bg-[#01040b]"
        />
      )}
      <motion.div
        style={reduce ? undefined : { scale, borderTopLeftRadius: radius, borderTopRightRadius: radius, transformOrigin: '50% 0%' }}
        className={`relative overflow-clip rounded-t-[40px] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.45)] ${
          fill ? 'flex min-h-[90svh] flex-col justify-center' : ''
        } ${className}`}
      >
        {children}
      </motion.div>
    </div>
  )

  if (!holding) return sheet

  // The hold is bounded: the wrapper gives the sheet exactly one extra screen to
  // stay pinned (the runway), and its negative bottom margin pulls the next sheet
  // up over that screen. After it, the covered sheet scrolls off the page like
  // normal content, so its animations pause instead of running underneath forever.
  return (
    <div data-hold-wrap="" className="relative -mt-10 mb-[-100svh]" style={{ zIndex: layer }}>
      {sheet}
      <div aria-hidden className="h-[100svh]" />
    </div>
  )
}

/**
 * Smooth-scroll to a section by id. Held sheets are `position: sticky`, so a
 * section inside one that is currently held reports its held position, not its
 * real one, and `scrollIntoView` lands in the wrong place. Measure from the
 * sheet's in-flow wrapper instead.
 */
export function scrollToSection(id: string, behavior: ScrollBehavior = 'smooth') {
  const el = document.getElementById(id)
  if (!el) return
  const sheet = el.closest<HTMLElement>('[data-hold-sheet]')
  const wrap = sheet?.parentElement
  if (!sheet || !wrap?.hasAttribute('data-hold-wrap')) {
    el.scrollIntoView({ behavior, block: 'start' })
    return
  }
  // The wrapper never sticks and the sheet sits at its very top, so it marks where the sheet really is
  const sheetTop = wrap.getBoundingClientRect().top + window.scrollY
  // Walk layout offsets rather than comparing screen rects: the sheet may still be
  // scaled down mid-arrival, which would shrink a screen-measured offset
  let offsetInSheet = 0
  for (let n: HTMLElement | null = el; n && n !== sheet; n = n.offsetParent as HTMLElement | null) offsetInSheet += n.offsetTop
  const scrollMargin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
  window.scrollTo({ top: sheetTop + offsetInSheet - scrollMargin, behavior })
}

/** Holds a non-sheet block (e.g. the hero) still for its last screen so the next sheet covers it. */
export function HoldStill({ className = '', children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotionSafe()
  const height = useHeight(ref, !reduce)
  if (reduce) return <div className={className}>{children}</div>
  return (
    <div className="relative mb-[-100svh]">
      <div ref={ref} style={{ position: 'sticky', top: holdTop(height) }} className={className}>
        {children}
      </div>
      <div aria-hidden className="h-[100svh]" />
    </div>
  )
}
