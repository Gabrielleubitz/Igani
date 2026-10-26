'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowRight } from 'lucide-react'
import { HeroCanvas } from '@/app/components/landing/hero/HeroCanvas'
import { HeroCube } from '@/app/components/landing/hero/HeroCube'
import { MagneticButton } from '@/app/components/landing/fx/MagneticButton'
import { SideNote } from '@/app/components/landing/fx/SideNote'

const EASE = [0.22, 1, 0.36, 1] as const

/** Counts 0.00 → 0.05 once it scrolls into view. */
function SecondsCounter() {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const [value, setValue] = useState(reduce ? 0.05 : 0)

  useEffect(() => {
    if (!inView || reduce) return
    const controls = animate(0, 0.05, { duration: 1.8, delay: 1.2, ease: EASE, onUpdate: setValue })
    return () => controls.stop()
  }, [inView, reduce])

  return (
    <span ref={ref} className="tabular-nums text-white/85">
      {value.toFixed(2)}s
    </span>
  )
}

export function Hero({ onCta, onSeeWhy }: { onCta: () => void; onSeeWhy: () => void }) {
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden" aria-label="IGANI">
      <HeroCanvas />

      {/* Legibility + depth */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_45%,transparent_0%,rgba(2,8,18,0.55)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#030814] to-transparent" />

      <div className="pointer-events-none absolute top-1/2 right-[1%] z-[11] hidden aspect-square h-[min(80vh,700px)] -translate-y-[51%] lg:block">
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4080E0]/22 blur-[80px]"
        />
        <div className="pointer-events-auto absolute inset-0">
          <HeroCube />
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 pb-32 pt-36 sm:px-6 lg:px-8">
        <div className="max-w-xl lg:max-w-[46rem]">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
            className="mb-8 text-sm text-white/60"
          >
            IGANI · a note on first impressions
          </motion.p>

          <h1 className="font-semibold leading-[0.95] tracking-[-0.035em] text-white">
            <motion.span
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
              className="block text-[clamp(2.6rem,7.4vw,5.25rem)] lg:whitespace-nowrap"
            >
              Your website is
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.35 }}
              className="block text-[clamp(2.6rem,7.4vw,5.25rem)] lg:whitespace-nowrap"
            >
              <span className="font-display pr-[0.04em] text-[1.08em] font-normal text-[#dbe6ff]">leaking</span> clients
              <span className="text-[#4080E0]">.</span>
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.55 }}
            className="!mt-8 max-w-xl text-lg leading-relaxed text-white/75 sm:text-xl"
          >
            People eat with their eyes. If your site looks like 2018, they assume your service is too.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.7 }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <MagneticButton onClick={onCta}>
              Fix your front door
              <ArrowRight className="h-4 w-4" />
            </MagneticButton>
            <MagneticButton variant="ghost" onClick={onSeeWhy}>
              Show me why
              <ArrowDown className="h-4 w-4" />
            </MagneticButton>
          </motion.div>
        </div>
      </div>

      {/* Bottom bar: the 0.05s fact (left) + margin note (right) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 1 }}
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-4 px-4 pb-7 sm:px-6 lg:px-8"
      >
        <p className="!mt-0 flex items-center gap-2 text-[13px] text-white/60">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4080E0] opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4080E0]" />
          </span>
          <span>
            <SecondsCounter /> — that&rsquo;s all the brain needs to judge your authority.
          </span>
        </p>

        <div className="hidden sm:block [@media(pointer:coarse)]:!hidden">
          <SideNote arrow="up">psst, the background is live. move your mouse.</SideNote>
        </div>
      </motion.div>
    </section>
  )
}
