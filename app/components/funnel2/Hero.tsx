'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView } from 'framer-motion'
import { useReducedMotionSafe } from '@/app/components/funnel-shared/useReducedMotionSafe'
import { FocusIn } from '@/app/components/funnel-shared/FocusIn'
import { ElegantButton } from './ElegantButton'

const ease = [0.22, 1, 0.36, 1] as const

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
    const controls = animate(0, 0.05, { duration: 2, delay: 1.5, ease, onUpdate: setValue })
    return () => controls.stop()
  }, [inView, reduce])

  return <span ref={ref} className="whitespace-nowrap font-cormorant text-3xl italic tabular-nums text-[#1F1C18]">{value.toFixed(2)} seconds</span>
}

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 1, delay, ease },
})

/** Gold opener: the headline settles into focus on its own, then the case and the CTA. */
export function Hero({ onCta }: { onCta: () => void }) {
  return (
    <section className="relative px-6 pb-28 pt-12 sm:px-10 lg:pt-20">
      <div className="mx-auto max-w-5xl text-center">
        <motion.span {...fadeUp(0)} className="text-[11px] uppercase tracking-[0.4em] text-[#1F1C18]/70">
          A note on first impressions
        </motion.span>

        <FocusIn className="mt-8">
          <h1 className="font-cormorant text-[14vw] font-normal leading-[0.98] tracking-[-0.01em] text-[#1F1C18] sm:text-7xl lg:text-[6.25rem]">
            Ready for a site that <em className="text-[#F7F3EC]">actually closes</em> for you?
          </h1>
        </FocusIn>

        <motion.p {...fadeUp(1.1)} className="mx-auto !mt-10 max-w-md text-lg leading-relaxed text-[#1F1C18]/80">
          People eat with their eyes. If your site looks like 2018, they assume your service is too.
        </motion.p>

        <motion.div {...fadeUp(1.3)} className="mx-auto mt-8 flex max-w-md items-baseline justify-center gap-4 border-y border-[#1F1C18]/20 py-4">
          <SecondsCounter />
          <span className="text-left text-sm text-[#1F1C18]/75">is all the mind needs to judge your authority.</span>
        </motion.div>

        <motion.div {...fadeUp(1.5)} className="mt-12">
          <ElegantButton onClick={onCta}>Fix your front door</ElegantButton>
        </motion.div>
      </div>
    </section>
  )
}
