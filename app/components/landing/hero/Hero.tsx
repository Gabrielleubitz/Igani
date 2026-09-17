'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowRight } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { landingContent } from '@/lib/landingContent'
import { HERO_PALETTES, HeroCanvas } from './HeroCanvas'
import { HeroCube } from './HeroCube'
import { KineticWord } from './KineticWord'
import { MagneticButton } from '../fx/MagneticButton'
import { SideNote } from '../fx/SideNote'

const EASE = [0.22, 1, 0.36, 1] as const

function useLocalClock(timeZone: string) {
  const [time, setTime] = useState('')
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone })
    const tick = () => setTime(fmt.format(new Date()))
    tick()
    const id = window.setInterval(tick, 10_000)
    return () => window.clearInterval(id)
  }, [timeZone])
  return time
}

type HeroProps = {
  onSeeWork: () => void
  /** Title of the most recently launched project, if known */
  latestProject?: string
}

export function Hero({ onSeeWork, latestProject }: HeroProps) {
  const { language } = useLanguage()
  const c = landingContent.hero
  const words = c.words.map((w) => w[language])
  const clock = useLocalClock('Asia/Jerusalem')

  const [palette, setPalette] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  const cyclePalette = () => {
    const next = (palette + 1) % HERO_PALETTES.length
    setPalette(next)
    setToast(HERO_PALETTES[next].name)
    window.setTimeout(() => setToast(null), 1800)
  }

  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden" aria-label="IGANI">
      <HeroCanvas palette={palette} />

      {/* Legibility + depth */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_45%,transparent_0%,rgba(2,8,18,0.55)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#030814] to-transparent" />

      {/* Cube on the right — a full object in a square stage, not a cropped close-up. */}
      <div className="pointer-events-none absolute top-1/2 right-[1%] z-[11] hidden aspect-square h-[min(80vh,700px)] -translate-y-[51%] lg:block">
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4080E0]/22 blur-[80px]"
        />
        <div className="pointer-events-auto absolute inset-0">
          <HeroCube palette={palette} />
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
          {c.eyebrow[language]}
        </motion.p>

        <h1 className="font-semibold leading-[0.95] tracking-[-0.035em] text-white">
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
            className="relative mt-[0.02em] flex max-w-full flex-nowrap items-baseline whitespace-nowrap text-[clamp(2.2rem,6.2vw,5.6rem)]"
          >
            <KineticWord words={words} />
            <button
              type="button"
              onClick={cyclePalette}
              title={c.periodHint[language]}
              aria-label={`${c.periodHint[language]} · ${c.paletteToast[language]} ${palette + 1}/${HERO_PALETTES.length}`}
              className="relative -ml-[0.04em] inline-block cursor-pointer text-[#4080E0] transition-transform duration-300 hover:scale-125 focus-visible:outline-none"
              style={{
                color: `rgb(${HERO_PALETTES[palette].c3.map((v) => Math.round(v * 255)).join(' ')})`,
                textShadow: '0 0 24px rgba(0,0,0,0.45)',
              }}
            >
              .
            </button>
            <AnimatePresence>
              {toast && (
                <motion.span
                  key={toast}
                  initial={{ opacity: 0, y: 8, x: -8 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35 }}
                  className="font-display pointer-events-none absolute -top-2 left-full ml-4 whitespace-nowrap text-[0.28em] font-normal tracking-normal text-[#dbe6ff]"
                >
                  {c.paletteToast[language]} {String(palette + 1).padStart(2, '0')}/{String(HERO_PALETTES.length).padStart(2, '0')} · {toast}
                </motion.span>
              )}
            </AnimatePresence>
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
      </div>

      {/* Bottom bar: status line (left) + margin note (right) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3, duration: 1 }}
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-4 px-4 pb-7 sm:px-6 lg:px-8"
      >
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-[13px] text-white/60">
          <div className="flex items-baseline gap-2">
            <dt className="sr-only">Local time</dt>
            <dd className="flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300" />
              </span>
              {c.statusLocal[language]}
              {clock && <span className="tabular-nums text-white/85">{clock}</span>}
            </dd>
          </div>
          {latestProject && (
            <div className="hidden items-baseline gap-2 sm:flex">
              <dt>{c.statusBuilding[language]}:</dt>
              <dd className="text-white/85">{latestProject}</dd>
            </div>
          )}
          <div className="hidden items-baseline gap-2 md:flex">
            <dd className="text-white/85">{c.statusOpen[language]}</dd>
          </div>
        </dl>

        <div className="hidden sm:block [@media(pointer:coarse)]:!hidden">
          <SideNote arrow="up">{c.note[language]}</SideNote>
        </div>
      </motion.div>
    </section>
  )
}
