'use client'

import { Fragment, ReactNode } from 'react'
import { motion } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { GrainOverlay } from './GrainOverlay'
import { CursorGlow } from './CursorGlow'
import { displaySerif } from './fonts'

/** The home page's frame — navy ground, grain, cursor glow, pill header, footer — for inner pages. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className={`relative min-h-screen bg-[#030814] text-white ${displaySerif.variable}`}>
      <GrainOverlay />
      <CursorGlow />
      <Header />
      <main className="relative">{children}</main>
      <div className="relative pt-10">
        <Footer />
      </div>
    </div>
  )
}

/** Splits "*word*" into the italic display serif, like the home page headlines. */
export function SerifAccent({ text, accent = 'text-[#dbe6ff]' }: { text: string; accent?: string }) {
  return (
    <>
      {text.split('*').map((seg, i) =>
        i % 2 === 1 ? (
          <span key={i} className={`font-display pr-[0.04em] text-[1.08em] font-normal ${accent}`}>
            {seg}
          </span>
        ) : (
          <Fragment key={i}>{seg}</Fragment>
        )
      )}
    </>
  )
}

const EASE = [0.22, 1, 0.36, 1] as const

/** Inner-page opener: hairline label row, a big headline with a serif accent, and an optional lead. */
export function PageIntro({
  label,
  title,
  sub,
  aside,
  children,
}: {
  label: string
  /** Wrap words in *asterisks* for the italic serif. */
  title: string
  sub?: ReactNode
  aside?: string
  children?: ReactNode
}) {
  return (
    <section className="relative overflow-hidden pb-16 pt-36 sm:pb-20 sm:pt-44">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#4080E0]/15 blur-[150px]" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-10 flex items-baseline justify-between gap-6 border-t border-white/[0.12] pt-3 text-[13px] text-white/60"
        >
          <span>{label}</span>
          {aside && <span className="hidden text-right sm:block">{aside}</span>}
        </motion.div>
        <motion.h1
          initial={{ y: 30 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="max-w-5xl text-balance text-[clamp(44px,7vw,104px)] font-semibold leading-[0.98] tracking-[-0.035em] text-white"
        >
          <SerifAccent text={title} />
        </motion.h1>
        {sub && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
            className="mt-8 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl"
          >
            {sub}
          </motion.div>
        )}
        {children}
      </div>
    </section>
  )
}
