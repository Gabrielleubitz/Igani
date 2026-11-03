'use client'

import { motion } from 'framer-motion'
import { ArrowDown, ArrowRight } from 'lucide-react'
import { MagneticButton } from '@/app/components/landing/fx/MagneticButton'
import { FocusIn } from '@/app/components/funnel-shared/FocusIn'

const EASE = [0.22, 1, 0.36, 1] as const

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: EASE, delay },
})

/** Opener: an agent's website is their first listing presentation. */
export function Hero({ onSeeWork, onStart }: { onSeeWork: () => void; onStart: () => void }) {
  return (
    <section id="hero" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden" aria-label="IGANI for real estate">
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 pb-24 pt-32 text-center [text-shadow:0_1px_20px_rgba(8,32,100,0.55)] sm:px-6 lg:px-8">
        <FocusIn>
          <h1 className="text-balance text-[clamp(2.6rem,8vw,6.5rem)] font-semibold leading-[0.96] tracking-[-0.035em] text-white">
            Buyers tour your{' '}
            <span className="font-display pr-[0.04em] text-[1.08em] font-normal text-[#e9f0ff]">website</span> before your listings
            <span className="text-white">.</span>
          </h1>
        </FocusIn>

        {/* Same serif as the italic accent words in the headline */}
        <motion.p {...fadeUp(1.0)} className="font-display !mt-7 text-[clamp(1.6rem,3.4vw,2.6rem)] italic leading-[1.1] text-[#e9f0ff]">
          Give them a reason to book the showing.
        </motion.p>

        <motion.div {...fadeUp(1.2)} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <MagneticButton onClick={onSeeWork}>
            See what we&rsquo;ve built
            <ArrowDown className="h-4 w-4" />
          </MagneticButton>
          <MagneticButton variant="ghost" onClick={onStart}>
            Build a website with Igani
            <ArrowRight className="h-4 w-4" />
          </MagneticButton>
        </motion.div>
      </div>
    </section>
  )
}
