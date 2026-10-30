'use client'

import { MotionValue, motion } from 'framer-motion'
import { CountUp, PinnedStage, useStatReveal } from '@/app/components/funnel-shared/PinnedStage'

const STATS = [
  {
    value: 50,
    unit: 'ms',
    source: 'Carleton University / Google research',
    body: 'Visitors judge how a site looks in 0.05 seconds. There is no second first impression.',
  },
  {
    value: 94,
    unit: '%',
    source: 'Human-computer trust research',
    body: 'Of first impressions are about design — not your copy, not your prices.',
  },
  {
    value: 75,
    unit: '%',
    source: 'Stanford Web Credibility Project',
    body: 'Of people judge how credible a company is from its website’s design.',
  },
]

function Stat({ progress, i }: { progress: MotionValue<number>; i: number }) {
  const s = STATS[i]
  const { opacity, y } = useStatReveal(progress, i, STATS.length)
  return (
    <motion.div
      style={{ opacity, y }}
      className="border-t border-[#030814]/10 py-4 md:rounded-3xl md:border md:border-[#030814]/10 md:bg-white md:p-8 md:shadow-[0_30px_60px_-30px_rgba(4,16,30,0.25)]"
    >
      <div className="flex items-baseline justify-between gap-4 md:block">
        <div className="flex items-baseline gap-1 text-5xl font-semibold tracking-[-0.04em] text-[#030814] md:text-7xl">
          <CountUp progress={progress} i={i} count={STATS.length} to={s.value} />
          <span className="font-display text-[0.7em] font-normal tracking-normal text-[#2A5FB8]">{s.unit}</span>
        </div>
        <div className="max-w-[55%] text-right text-[11px] leading-4 text-[#3A4660] md:mt-4 md:max-w-none md:border-t md:border-[#030814]/10 md:pt-4 md:text-left md:text-[13px]">
          {s.source}
        </div>
      </div>
      <p className="!mt-2 text-[15px] leading-relaxed text-[#030814]/75 md:!mt-4">{s.body}</p>
    </motion.div>
  )
}

/**
 * "Why this change is crucial": the page's one light chapter. Pins while the
 * three research numbers count up one after another.
 */
export function WhyCrucial() {
  return (
    <section id="why" className="relative scroll-mt-20 text-[#030814]">
      <PinnedStage className="pb-20 pt-28 sm:pt-32 md:pb-10">
        {(progress) => (
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-baseline justify-between gap-6 border-t border-[#030814]/15 pt-3 text-[13px] text-[#3A4660] md:mb-10">
              <span className="flex items-baseline gap-3">
                <span className="font-display text-lg leading-none text-[#030814]/80">02</span>
                <span>Why this change is crucial</span>
              </span>
              <span className="hidden sm:block">keep scrolling — watch the numbers</span>
            </div>
            <h2 className="mb-6 max-w-4xl border-none pb-0 text-balance text-4xl font-semibold leading-[1.0] tracking-[-0.03em] text-[#030814] sm:text-5xl md:mb-12 lg:text-6xl">
              Your site is judged <span className="font-display pr-[0.04em] text-[1.08em] font-normal text-[#2A5FB8]">before</span> it&rsquo;s read.
            </h2>
            <div className="md:grid md:grid-cols-3 md:gap-4">
              {STATS.map((_, i) => (
                <Stat key={i} progress={progress} i={i} />
              ))}
            </div>
          </div>
        )}
      </PinnedStage>
    </section>
  )
}
