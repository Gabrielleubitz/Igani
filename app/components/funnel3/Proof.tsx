'use client'

import { motion } from 'framer-motion'
import { SectionHeading } from '@/app/components/landing/fx/SectionHeading'
import { SpotlightCard } from '@/app/components/landing/fx/SpotlightCard'

const STATS = [
  {
    value: '50',
    unit: 'ms',
    source: 'Carleton University / Google research',
    body: 'Users make an aesthetic judgment in 0.05s. You don’t get a second chance.',
  },
  {
    value: '94',
    unit: '%',
    source: 'Human-computer trust research',
    body: '94% of first impressions are design-related. Not your copy. Not your prices.',
  },
  {
    value: '75',
    unit: '%',
    source: 'Stanford Web Credibility Project',
    body: '75% of users judge a company’s credibility based on its website design.',
  },
]

export function Proof() {
  return (
    <section id="proof" className="relative scroll-mt-20 border-t border-white/[0.06] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading index="02" label="The proof" aside="three studies, zero stories" title="No stories. *Just* data." className="mb-12" />

        <div className="grid gap-4 md:grid-cols-3">
          {STATS.map((s, i) => (
            <motion.div
              key={s.source}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <SpotlightCard className="h-full p-7 sm:p-8">
                <div className="flex items-baseline gap-1 text-6xl font-semibold tracking-[-0.04em] text-white sm:text-7xl">
                  {s.value}
                  <span className="font-display text-[0.7em] font-normal tracking-normal text-[#dbe6ff]">{s.unit}</span>
                </div>
                <div className="mt-4 flex items-baseline gap-3 border-t border-white/[0.08] pt-4 text-[13px] text-white/55">
                  <span className="font-display text-lg leading-none text-white/70">0{i + 1}</span>
                  {s.source}
                </div>
                <div className="mt-4 text-[15px] leading-relaxed text-white/70">{s.body}</div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
