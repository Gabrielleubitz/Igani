'use client'

import { motion } from 'framer-motion'

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

const ease = [0.22, 1, 0.36, 1] as const

export function Proof() {
  return (
    <section className="bg-[#EFE8DC] px-6 py-28 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <span className="text-[11px] uppercase tracking-[0.4em] text-[#A9845A]">II. The proof</span>
          <h2 className="mt-6 border-0 pb-0 font-cormorant text-5xl font-normal text-[#1F1C18] sm:text-6xl">
            No stories. <em>Just data.</em>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 md:divide-x md:divide-[#D8CCBA]">
          {STATS.map((s, i) => (
            <motion.div
              key={s.source}
              initial="rest"
              whileInView="lit"
              viewport={{ once: true, amount: 0.5 }}
              variants={{ rest: { opacity: 0, y: 24 }, lit: { opacity: 1, y: 0 } }}
              transition={{ duration: 1.1, delay: i * 0.15, ease }}
              className="border-b border-[#D8CCBA] px-2 py-10 last:border-b-0 md:border-b-0 md:px-10 md:py-4"
            >
              <div className="font-cormorant text-8xl font-normal leading-none text-[#1F1C18]">
                {s.value}
                <span className="ml-1 text-5xl italic text-[#A9845A]">{s.unit}</span>
              </div>
              {/* Gold rule draws in as the column enters view */}
              <motion.div
                variants={{ rest: { scaleX: 0 }, lit: { scaleX: 1 } }}
                transition={{ duration: 1.2, delay: i * 0.15 + 0.3, ease }}
                className="mt-6 h-px w-24 origin-left bg-[#A9845A]"
              />
              <div className="mt-5 text-[10px] uppercase tracking-[0.3em] text-[#6E665C]">{s.source}</div>
              <div className="mt-4 leading-relaxed text-[#4A443D]">{s.body}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
