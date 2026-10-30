'use client'

import { MotionValue, motion, useTransform } from 'framer-motion'
import { CountUp, PinnedStage, statWindow, useStatReveal } from '@/app/components/funnel-shared/PinnedStage'

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
  const [a, b] = statWindow(i, STATS.length)
  // Gold rule draws in alongside the count
  const rule = useTransform(progress, [a, b], [0, 1], { clamp: true })

  return (
    <motion.div
      style={{ opacity, y }}
      className="border-b border-[#F7F3EC]/10 py-3 last:border-b-0 md:border-b-0 md:px-10 md:py-2"
    >
      <div className="flex items-baseline justify-between gap-4 md:block">
        <div className="font-cormorant text-5xl font-normal leading-none text-[#F7F3EC] md:text-8xl">
          <CountUp progress={progress} i={i} count={STATS.length} to={s.value} />
          <span className="ml-1 text-[0.6em] italic text-[#C9A774]">{s.unit}</span>
        </div>
        <motion.div style={{ scaleX: rule }} className="hidden h-px w-24 origin-left bg-[#C9A774] md:mt-6 md:block" />
        <div className="max-w-[55%] text-right text-[9px] uppercase leading-4 tracking-[0.25em] text-[#F7F3EC]/50 md:mt-5 md:max-w-none md:text-left md:text-[10px] md:tracking-[0.3em]">
          {s.source}
        </div>
      </div>
      <div className="mt-2 text-sm leading-snug text-[#F7F3EC]/75 md:mt-4 md:text-base md:leading-relaxed">{s.body}</div>
    </motion.div>
  )
}

export function Proof() {
  return (
    <PinnedStage className="px-6 pb-24 pt-16 sm:px-10 md:py-10">
      {(progress) => (
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-4 text-center md:mb-16">
            <span className="text-[11px] uppercase tracking-[0.4em] text-[#C9A774]">II. The proof</span>
            <h2 className="mt-3 border-0 pb-0 font-cormorant text-4xl font-normal text-[#F7F3EC] sm:text-6xl md:mt-6">
              No stories. <em className="text-[#C9A774]">Just data.</em>
            </h2>
            <div className="mt-4 hidden text-[10px] uppercase tracking-[0.3em] text-[#F7F3EC]/40 sm:block">Continue scrolling</div>
          </div>
          <div className="md:grid md:grid-cols-3 md:divide-x md:divide-[#F7F3EC]/10">
            {STATS.map((_, i) => (
              <Stat key={i} progress={progress} i={i} />
            ))}
          </div>
        </div>
      )}
    </PinnedStage>
  )
}
