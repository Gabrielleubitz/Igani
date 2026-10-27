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

/** `top` for a sticky element whose bottom should stop at the bottom of the viewport. */
export function useHoldTop(ref: React.RefObject<HTMLElement>, enabled: boolean) {
  const [top, setTop] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!enabled || !el) return
    const measure = () => setTop(Math.min(0, window.innerHeight - el.offsetHeight))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [ref, enabled])
  return top
}

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
  const holdTop = useHoldTop(ref, hold && !reduce)
  const { scrollYProgress } = useScroll({ target: ref, offset: hold ? ['start end', 'start 0.35'] : ['start end', 'start start'] })
  const scale = useTransform(scrollYProgress, hold ? [0, 1] : [0, 0.7], [0.94, 1])
  const radius = useTransform(scrollYProgress, hold ? [0.55, 1] : [0.75, 1], [40, 0])
  const veil = useTransform(scrollYProgress, [0, 1], [0, 0.7])

  return (
    <>
    {/* In-flow marker: where this sheet really sits, even while it's held (see scrollToSection) */}
    {hold && <div data-hold-marker aria-hidden />}
    <div
      ref={ref}
      id={id}
      data-hold-sheet={hold ? '' : undefined}
      style={{ zIndex: layer, ...(hold && !reduce ? { position: 'sticky', top: holdTop } : {}) }}
      className="relative -mt-10"
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
    </>
  )
}

/**
 * Smooth-scroll to a section by id. Held sheets are `position: sticky`, so a
 * section inside one that has already been passed reports its held position,
 * not its real one, and `scrollIntoView` lands in the wrong place. Measure from
 * the sheet's in-flow marker instead.
 */
export function scrollToSection(id: string, behavior: ScrollBehavior = 'smooth') {
  const el = document.getElementById(id)
  if (!el) return
  const sheet = el.closest<HTMLElement>('[data-hold-sheet]')
  const marker = sheet?.previousElementSibling as HTMLElement | null
  if (!sheet || !marker?.hasAttribute('data-hold-marker')) {
    el.scrollIntoView({ behavior, block: 'start' })
    return
  }
  const sheetTop = marker.getBoundingClientRect().top + window.scrollY + parseFloat(getComputedStyle(sheet).marginTop)
  const offsetInSheet = el.getBoundingClientRect().top - sheet.getBoundingClientRect().top
  const scrollMargin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
  window.scrollTo({ top: sheetTop + offsetInSheet - scrollMargin, behavior })
}

/** Holds a non-sheet block (e.g. the hero) still for its last screen so the next sheet covers it. */
export function HoldStill({ className = '', children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotionSafe()
  const top = useHoldTop(ref, !reduce)
  return (
    <div ref={ref} style={reduce ? undefined : { position: 'sticky', top }} className={className}>
      {children}
    </div>
  )
}
