'use client'

import { MotionValue, motion } from 'framer-motion'
import { CountUp, PinnedStage, useStatReveal } from '@/app/components/funnel-shared/PinnedStage'

const STATS = [
  {
    value: 50,
    unit: 'ms',
    source: 'Carleton University / Google research',
    body: 'Users make an aesthetic judgment in 0.05s. You don’t get a second chance.',
  },
  {
    value: 94,
    unit: '%',
    source: 'Human-computer trust research',
    body: '94% of first impressions are design-related. Not your copy. Not your prices.',
  },
  {
    value: 75,
    unit: '%',
    source: 'Stanford Web Credibility Project',
    body: '75% of users judge a company’s credibility based on its website design.',
  },
]

function Stat({ progress, i }: { progress: MotionValue<number>; i: number }) {
  const s = STATS[i]
  const { opacity, y } = useStatReveal(progress, i, STATS.length)
  return (
    <motion.div
      style={{ opacity, y }}
      className="grid grid-cols-[auto_1fr] items-baseline gap-x-5 border-t border-[#04101e]/10 py-4 md:block md:rounded-3xl md:border md:border-[#04101e]/10 md:bg-white md:p-8 md:shadow-[0_30px_60px_-30px_rgba(4,16,30,0.25)]"
    >
      <div className="flex items-baseline gap-1 text-5xl font-semibold tracking-[-0.04em] text-[#04101e] md:text-7xl">
        <CountUp progress={progress} i={i} count={STATS.length} to={s.value} />
        <span className="font-display text-[0.7em] font-normal tracking-normal text-[#2f6fd8]">{s.unit}</span>
      </div>
      <div>
        <div className="flex items-baseline gap-3 text-[13px] text-[#04101e]/55 md:mt-4 md:border-t md:border-[#04101e]/10 md:pt-4">
          <span className="font-display hidden text-lg leading-none text-[#04101e]/70 md:inline">0{i + 1}</span>
          {s.source}
        </div>
        <div className="mt-1 text-[15px] leading-relaxed text-[#04101e]/75 md:mt-4">{s.body}</div>
      </div>
    </motion.div>
  )
}

export function Proof() {
  return (
    <section id="proof" className="relative scroll-mt-20">
      <PinnedStage className="pb-24 pt-28 sm:pt-32 md:pb-10">
        {(progress) => (
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            {/* Same editorial opener as SectionHeading, inverted for the light surface */}
            <div className="mb-6 flex items-baseline justify-between gap-6 border-t border-[#04101e]/15 pt-3 text-[13px] text-[#04101e]/60 md:mb-10">
              <span className="flex items-baseline gap-3">
                <span className="font-display text-lg leading-none text-[#04101e]/80">02</span>
                <span>The proof</span>
              </span>
              <span className="hidden sm:block">keep scrolling — watch the numbers</span>
            </div>
            <h2 className="mb-6 border-none pb-0 text-4xl font-semibold leading-[1.0] tracking-[-0.025em] text-[#04101e] sm:text-5xl md:mb-12 lg:text-6xl">
              No stories. <span className="font-display pr-[0.04em] text-[1.08em] font-normal text-[#2f6fd8]">Just</span> data.
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
