'use client'

import { Fragment, ReactNode, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useReducedMotionSafe } from '@/app/components/funnel-shared/useReducedMotionSafe'

type ChapterOpenerProps = {
  /** Two-digit chapter number, e.g. "02" */
  index: string
  label: string
  /** Wrap words in *asterisks* for the italic serif. */
  title: string
  sub?: string
  aside?: string
  tone?: 'dark' | 'light'
  /** Keep the opener pinned while the chapter's content slides up over it. */
  sticky?: boolean
  className?: string
  children?: ReactNode
}

/** Splits "*word*" spans into italic serif words, keeping punctuation glued to its word. */
function Title({ text, accent }: { text: string; accent: string }) {
  const words: { text: string; italic: boolean }[][] = []
  let current: { text: string; italic: boolean }[] = []
  text.split('*').forEach((seg, i) => {
    seg.split(/(\s+)/).forEach((part) => {
      if (!part) return
      if (/^\s+$/.test(part)) {
        if (current.length) words.push(current)
        current = []
      } else current.push({ text: part, italic: i % 2 === 1 })
    })
  })
  if (current.length) words.push(current)

  return (
    <>
      {words.map((word, i) => (
        <Fragment key={i}>
          <motion.span
            className="inline-block"
            // Rises into place but is never invisible, so a chapter never opens on a blank
            initial={{ y: '30%' }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, margin: '0px 0px -10% 0px' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.035 }}
          >
            {word.map((chunk, k) =>
              chunk.italic ? (
                <span key={k} className={`font-display pr-[0.04em] text-[1.08em] font-normal ${accent}`}>
                  {chunk.text}
                </span>
              ) : (
                <Fragment key={k}>{chunk.text}</Fragment>
              )
            )}
          </motion.span>
          {i < words.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </>
  )
}

/**
 * A chapter's opening band: an oversized serif numeral, the label row and a
 * big headline. Pinned by default so the chapter's content visibly slides
 * over it — the page reads as distinct chapters, not one feed.
 */
export function ChapterOpener({
  index,
  label,
  title,
  sub,
  aside,
  tone = 'dark',
  sticky = true,
  className = '',
  children,
}: ChapterOpenerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotionSafe()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const numeralY = useTransform(scrollYProgress, [0, 1], ['18%', '-18%'])

  const light = tone === 'light'
  const c = {
    numeral: light ? 'text-[#4080E0]/80' : 'text-[#4080E0]/90',
    rule: light ? 'border-[#030814]/15' : 'border-white/[0.12]',
    meta: light ? 'text-[#3A4660]' : 'text-white/60',
    metaIndex: light ? 'text-[#030814]/80' : 'text-white/80',
    title: light ? 'text-[#030814]' : 'text-white',
    accent: light ? 'text-[#2A5FB8]' : 'text-[#dbe6ff]',
    sub: light ? 'text-[#3A4660]' : 'text-white/70',
  }

  return (
    <>
    <div
      ref={ref}
      className={`${sticky ? 'sticky top-0' : 'relative'} flex min-h-[55svh] flex-col justify-end overflow-hidden pb-14 pt-28 sm:min-h-[70svh] sm:pb-20 ${className}`}
    >
      <motion.span
        aria-hidden
        style={reduce ? undefined : { y: numeralY }}
        className={`font-display pointer-events-none absolute -top-[0.08em] end-[3vw] select-none text-[clamp(140px,20vw,320px)] italic leading-[0.8] ${c.numeral}`}
      >
        {index}
      </motion.span>

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className={`mb-8 flex items-baseline justify-between gap-6 border-t pt-3 text-[13px] ${c.rule} ${c.meta}`}>
          <span className="flex items-baseline gap-3">
            <span className={`font-display text-lg leading-none ${c.metaIndex}`}>{index}</span>
            <span>{label}</span>
          </span>
          {aside && <span className="hidden text-right sm:block">{aside}</span>}
        </div>
        <h2
          className={`max-w-5xl border-none pb-0 text-balance text-[clamp(40px,6.5vw,104px)] font-semibold leading-[0.98] tracking-[-0.03em] ${c.title}`}
        >
          <Title text={title} accent={c.accent} />
        </h2>
        {sub && <p className={`!mt-8 max-w-2xl text-lg leading-relaxed sm:text-xl ${c.sub}`}>{sub}</p>}
        {children}
      </div>
    </div>
    {/* A beat where the pinned title sits alone before the content slides up over it */}
    {sticky && <div aria-hidden className="h-[22svh] sm:h-[28svh]" />}
    </>
  )
}

/** The chapter's content, sliding up over its pinned opener on its own surface. */
export function ChapterBody({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`relative z-[2] rounded-t-[32px] shadow-[0_-1px_0_rgba(255,255,255,0.06),0_-30px_60px_-30px_rgba(0,0,0,0.6)] ${className}`}
    >
      {children}
    </div>
  )
}
