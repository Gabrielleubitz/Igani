'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView } from 'framer-motion'
import { useReducedMotionSafe } from '@/app/components/funnel-shared/useReducedMotionSafe'
import { FocusIn } from '@/app/components/funnel-shared/FocusIn'
import { GlowButton } from './GlowButton'

/** Counts 0.00 → 0.05 once it scrolls into view. */
function SecondsCounter() {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotionSafe()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!inView) return
    if (reduce) {
      setValue(0.05)
      return
    }
    const controls = animate(0, 0.05, {
      duration: 1.6,
      delay: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setValue,
    })
    return () => controls.stop()
  }, [inView, reduce])

  return (
    <span ref={ref} className="tabular-nums text-[#00F0FF]">
      {value.toFixed(2)} SECONDS
    </span>
  )
}

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
})

/** Bold violet opener: the headline comes into focus on its own, then the case and the CTA. */
export function Hero({ onCta }: { onCta: () => void }) {
  return (
    <section className="relative flex min-h-[calc(100svh-72px)] items-center overflow-hidden px-4 pb-24 pt-6 sm:px-6">
      <div aria-hidden className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-[#00F0FF]/25 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute -right-24 bottom-10 h-96 w-96 rounded-full bg-[#ff4fd8]/20 blur-[120px]" />

      <div className="relative mx-auto w-full max-w-6xl text-center">
        <FocusIn>
          <h1 className="font-clash text-[13vw] font-bold leading-[0.95] tracking-tight text-white sm:text-7xl lg:text-[6.5rem]">
            Ready for a site that{' '}
            <span className="text-[#00F0FF] drop-shadow-[0_0_30px_rgba(0,240,255,0.6)]">actually closes</span> for you?
          </h1>
        </FocusIn>

        <motion.p {...fadeUp(1.1)} className="mx-auto !mt-8 max-w-xl text-lg leading-relaxed text-white/80 sm:text-xl">
          People eat with their eyes. If your site looks like 2018, they assume your service is too.
        </motion.p>

        <motion.p {...fadeUp(1.3)} className="!mt-6 font-mono text-xs uppercase tracking-[0.18em] text-white/60 sm:text-sm">
          <SecondsCounter /> — That&rsquo;s all the brain needs to judge your authority.
        </motion.p>

        <motion.div {...fadeUp(1.5)} className="mt-10">
          <GlowButton onClick={onCta}>FIX YOUR FRONT DOOR</GlowButton>
        </motion.div>
      </div>
    </section>
  )
}
