'use client'

import { motion } from 'framer-motion'
import { ArrowDown, ArrowRight, Sparkles } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { landingContent } from '@/lib/landingContent'
import { HeroCanvas } from './HeroCanvas'
import { KineticWord } from './KineticWord'
import { MagneticButton } from '../fx/MagneticButton'

const EASE = [0.22, 1, 0.36, 1] as const

export function Hero({ onSeeWork }: { onSeeWork: () => void }) {
  const { language } = useLanguage()
  const c = landingContent.hero
  const words = c.words.map((w) => w[language])

  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden" aria-label="IGANI">
      <HeroCanvas />

      {/* Legibility + depth */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_45%,transparent_0%,rgba(2,8,18,0.55)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#030814] to-transparent" />

      {/* Live badge */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.9 }}
        className="pointer-events-none absolute right-8 top-28 z-10 hidden sm:block"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/70 backdrop-blur-md">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#80A0E0] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#80A0E0]" />
          </span>
          {c.liveBadge[language]}
        </span>
      </motion.div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 pb-24 pt-36 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
          className="mb-8 inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.35em] text-[#9ec0f5]"
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
          {c.eyebrow[language]}
        </motion.p>

        <h1 className="text-balance font-semibold leading-[0.95] tracking-[-0.03em] text-white">
          <motion.span
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
            className="block text-[clamp(2.75rem,9vw,7.5rem)]"
          >
            {c.lead[language]}
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.35 }}
            className="block text-[clamp(2.75rem,9vw,7.5rem)]"
          >
            <KineticWord words={words} suffix="." />
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.55 }}
          className="!mt-8 max-w-xl text-lg leading-relaxed text-white/75 sm:text-xl"
        >
          {c.sub[language]}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.7 }}
          className="mt-10 flex flex-wrap items-center gap-3"
        >
          <MagneticButton href="/contact">
            {c.ctaPrimary[language]}
            <ArrowRight className="h-4 w-4" />
          </MagneticButton>
          <MagneticButton variant="ghost" onClick={onSeeWork}>
            {c.ctaSecondary[language]}
            <ArrowDown className="h-4 w-4" />
          </MagneticButton>
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="pointer-events-none absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-white/50"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.3em]">{c.scroll[language]}</span>
        <span className="block h-10 w-px overflow-hidden bg-white/15">
          <span className="block h-3 w-px animate-scroll-hint bg-[#80A0E0]" />
        </span>
      </motion.div>
    </section>
  )
}
