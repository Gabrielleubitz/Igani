'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { animate, motion, useInView } from 'framer-motion'
import { useReducedMotionSafe } from '@/app/components/funnel-shared/useReducedMotionSafe'
import { GlowButton } from './GlowButton'

const HeroScene = dynamic(() => import('./HeroScene').then((m) => m.HeroScene), { ssr: false })

const HEADLINE = ['YOUR', 'WEBSITE', 'IS', 'LEAKING', 'CLIENTS.']

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
      delay: 0.9,
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

export function Hero({ onCta }: { onCta: () => void }) {
  return (
    <section className="relative flex min-h-[calc(100svh-72px)] items-center overflow-hidden px-4 pb-16 pt-6 sm:px-6">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="relative z-10">
          <h1 className="group font-clash text-[13vw] font-bold leading-[0.9] tracking-tight sm:text-7xl lg:text-[5.5rem]">
            {HEADLINE.map((word, i) => (
              <motion.span
                key={word}
                initial={{ opacity: 0, y: 40, filter: 'blur(12px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.7, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
                className={`mr-[0.22em] inline-block ${
                  word === 'LEAKING' || word === 'CLIENTS.'
                    ? 'funnel-pulse bg-gradient-to-r from-[#00F0FF] via-white to-[#7000FF] bg-[length:200%_auto] bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(0,240,255,0.35)]'
                    : 'text-white'
                }`}
              >
                {word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-white/65 sm:text-xl"
          >
            People eat with their eyes. If your site looks like 2018, they assume your service is too.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-8 font-mono text-xs uppercase tracking-[0.18em] text-white/50 sm:text-sm"
          >
            <SecondsCounter /> — That&rsquo;s all the brain needs to judge your authority.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.85 }}
            className="mt-10"
          >
            <GlowButton onClick={onCta}>FIX YOUR FRONT DOOR</GlowButton>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative h-[300px] sm:h-[440px] lg:h-[560px]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[10%] rounded-full bg-[radial-gradient(circle,rgba(0,240,255,0.28)_0%,rgba(112,0,255,0.22)_40%,transparent_70%)] blur-2xl"
          />
          <HeroScene />
        </motion.div>
      </div>
    </section>
  )
}
