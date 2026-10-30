'use client'

import { motion } from 'framer-motion'
import { ArrowDown, ArrowRight } from 'lucide-react'
import { HeroCanvas } from '@/app/components/landing/hero/HeroCanvas'
import { HeroCube } from '@/app/components/landing/hero/HeroCube'
import { MagneticButton } from '@/app/components/landing/fx/MagneticButton'

const EASE = [0.22, 1, 0.36, 1] as const

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: EASE, delay },
})

/** Opening: why a site matters for a service business, then straight to the proof. */
export function HomeHero({ onCheckWork }: { onCheckWork: () => void }) {
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden" aria-label="IGANI">
      <HeroCanvas />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_45%,transparent_0%,rgba(2,8,18,0.55)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#030814] to-transparent" />

      <div className="pointer-events-none absolute top-1/2 right-[1%] z-[11] hidden aspect-square h-[min(80vh,700px)] -translate-y-[51%] lg:block">
        <div aria-hidden className="absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4080E0]/22 blur-[80px]" />
        <div className="pointer-events-auto absolute inset-0">
          <HeroCube />
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 pb-28 pt-36 sm:px-6 lg:px-8">
        <div className="max-w-xl lg:max-w-[44rem]">
          <motion.p {...fadeUp(0.1)} className="mb-8 text-sm text-white/60">
            Websites for service businesses
          </motion.p>

          <h1 className="font-semibold leading-[0.95] tracking-[-0.035em] text-white">
            <motion.span {...fadeUp(0.2)} className="block text-[clamp(2.5rem,6.2vw,5.4rem)] lg:whitespace-nowrap">
              Clients judge you
            </motion.span>
            <motion.span {...fadeUp(0.35)} className="block text-[clamp(2.5rem,6.2vw,5.4rem)] lg:whitespace-nowrap">
              before they <span className="font-display pr-[0.04em] text-[1.08em] font-normal text-[#dbe6ff]">call</span>
              <span className="text-[#4080E0]">.</span>
            </motion.span>
          </h1>

          <motion.p {...fadeUp(0.55)} className="!mt-8 max-w-xl text-lg leading-relaxed text-white/75 sm:text-xl">
            For a service company, your website is the first meeting. In a fraction of a second it decides whether you look
            like the expert or the cheaper option. We build the kind that wins that meeting.
          </motion.p>

          <motion.div {...fadeUp(0.7)} className="mt-10 flex flex-wrap items-center gap-3">
            <MagneticButton onClick={onCheckWork}>
              Check our work
              <ArrowDown className="h-4 w-4" />
            </MagneticButton>
            <MagneticButton variant="ghost" href="/start">
              Start a project
              <ArrowRight className="h-4 w-4" />
            </MagneticButton>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
