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
    <motion.div style={{ opacity, y }} className="relative rounded-3xl bg-gradient-to-br from-[#00C8D6] via-[#00C8D6]/20 to-[#7000FF] p-px">
      <div className="h-full rounded-[calc(1.5rem-1px)] bg-white px-4 py-3 md:p-8">
        <div className="flex items-baseline justify-between gap-4 md:block">
          <div className="font-clash text-4xl font-bold text-[#0A0A0C] md:text-7xl">
            <CountUp progress={progress} i={i} count={STATS.length} to={s.value} />
            <span className="text-[#7000FF]">{s.unit}</span>
          </div>
          <div className="max-w-[55%] text-right font-mono text-[9px] uppercase leading-4 tracking-[0.15em] text-[#7000FF] md:mt-3 md:max-w-none md:text-left md:text-[11px] md:leading-5 md:tracking-[0.2em]">
            {s.source}
          </div>
        </div>
        <div className="mt-1 text-sm leading-snug text-[#0A0A0C]/70 md:mt-4 md:text-[15px] md:leading-relaxed">{s.body}</div>
      </div>
    </motion.div>
  )
}

export function ProofCards() {
  return (
    <PinnedStage className="px-4 pb-24 pt-16 sm:px-6 md:py-10">
      {(progress) => (
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-4 text-center md:mb-12">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-[#7000FF]">The proof</div>
            <h2 className="mt-2 border-0 pb-0 font-clash text-3xl font-bold text-[#0A0A0C] sm:text-5xl md:mt-4">Zero stories. Just data.</h2>
            <div className="mt-3 hidden font-mono text-[11px] uppercase tracking-[0.2em] text-[#0A0A0C]/45 sm:block">Keep scrolling — watch the numbers</div>
          </div>
          <div className="grid gap-2 md:grid-cols-3 md:gap-5">
            {STATS.map((_, i) => (
              <Stat key={i} progress={progress} i={i} />
            ))}
          </div>
        </div>
      )}
    </PinnedStage>
  )
}
