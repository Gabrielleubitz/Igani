'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView } from 'framer-motion'
import { ArrowDown, ArrowRight } from 'lucide-react'
import { MagneticButton } from '@/app/components/landing/fx/MagneticButton'
import { useReducedMotionSafe } from '@/app/components/funnel-shared/useReducedMotionSafe'
import { FocusIn } from '@/app/components/funnel-shared/FocusIn'

const EASE = [0.22, 1, 0.36, 1] as const

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
    const controls = animate(0, 0.05, { duration: 1.8, delay: 1.6, ease: EASE, onUpdate: setValue })
    return () => controls.stop()
  }, [inView, reduce])

  return (
    <span ref={ref} className="tabular-nums text-white">
      {value.toFixed(2)}s
    </span>
  )
}

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: EASE, delay },
})

/** Brand-blue opener: the headline comes into focus on its own, then the case and the CTAs. */
export function Hero({ onCta, onSeeWhy }: { onCta: () => void; onSeeWhy: () => void }) {
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden" aria-label="IGANI">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-white/15 blur-[140px]" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 pb-24 pt-32 text-center sm:px-6 lg:px-8">
        <motion.p {...fadeUp(0)} className="mb-8 text-sm text-white/75">
          IGANI · a note on first impressions
        </motion.p>

        <FocusIn>
          <h1 className="text-balance text-[clamp(2.6rem,8vw,6.5rem)] font-semibold leading-[0.96] tracking-[-0.035em] text-white">
            Ready for a site that{' '}
            <span className="font-display pr-[0.04em] text-[1.08em] font-normal text-[#e9f0ff]">actually closes</span> for you
            <span className="text-[#04101e]">?</span>
          </h1>
        </FocusIn>

        <motion.p {...fadeUp(1.1)} className="!mt-8 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl">
          People eat with their eyes. If your site looks like 2018, they assume your service is too.
        </motion.p>

        <motion.div {...fadeUp(1.3)} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <MagneticButton onClick={onCta}>
            Fix your front door
            <ArrowRight className="h-4 w-4" />
          </MagneticButton>
          <MagneticButton variant="ghost" onClick={onSeeWhy}>
            Show me why
            <ArrowDown className="h-4 w-4" />
          </MagneticButton>
        </motion.div>

        <motion.p {...fadeUp(1.5)} className="!mt-10 text-[13px] text-white/75">
          <span className="relative mr-2 inline-flex h-1.5 w-1.5 align-middle">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          <span>
            <SecondsCounter /> — that&rsquo;s all the brain needs to judge your authority.
          </span>
        </motion.p>
      </div>
    </section>
  )
}
