'use client'

import { motion } from 'framer-motion'

const STATS = [
  {
    value: '50ms',
    source: 'Carleton University / Google research',
    body: 'Users make an aesthetic judgment in 0.05s. You don’t get a second chance.',
  },
  {
    value: '94%',
    source: 'Human-computer trust research',
    body: '94% of first impressions are design-related. Not your copy. Not your prices.',
  },
  {
    value: '75%',
    source: 'Stanford Web Credibility Project',
    body: '75% of users judge a company’s credibility based on its website design.',
  },
]

export function ProofCards() {
  return (
    <section className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#00F0FF]">The proof</p>
          <h2 className="mt-4 border-0 pb-0 font-clash text-4xl font-bold text-white sm:text-5xl">Zero stories. Just data.</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {STATS.map((s, i) => (
            <motion.div
              key={s.value}
              initial="rest"
              whileInView="lit"
              viewport={{ once: true, amount: 0.5 }}
              variants={{ rest: { opacity: 0.45, y: 24 }, lit: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="group relative rounded-3xl p-px"
            >
              {/* Neon border that ignites as the card enters view */}
              <motion.span
                aria-hidden
                variants={{ rest: { opacity: 0.15 }, lit: { opacity: 1 } }}
                transition={{ duration: 0.8, delay: i * 0.08 + 0.15 }}
                className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#00F0FF] via-[#00F0FF]/20 to-[#7000FF] shadow-[0_0_40px_-8px_rgba(0,240,255,0.6)]"
              />
              <div className="relative h-full rounded-[calc(1.5rem-1px)] bg-[#0D0D12]/95 p-8 backdrop-blur-xl">
                <p className="font-clash text-6xl font-bold text-white drop-shadow-[0_0_20px_rgba(0,240,255,0.35)]">
                  {s.value}
                </p>
                <p className="mt-3 font-mono text-[11px] uppercase leading-5 tracking-[0.2em] text-[#00F0FF]">{s.source}</p>
                <p className="mt-4 leading-relaxed text-white/65">{s.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
