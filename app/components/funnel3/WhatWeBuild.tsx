'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { SectionHeading } from '@/app/components/landing/fx/SectionHeading'
import { SpotlightCard } from '@/app/components/landing/fx/SpotlightCard'

const spring = { type: 'spring', stiffness: 220, damping: 22 } as const
const inView = { once: true, amount: 0.5 } as const

function Card({ index, title, body, className = '', children }: { index: string; title: string; body: string; className?: string; children: ReactNode }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={spring}
      className={className}
    >
      <SpotlightCard className="flex h-full flex-col p-6 sm:p-8">
        <div className="mb-8 flex-1">{children}</div>
        <p className="!mt-0 flex items-baseline gap-3 text-sm text-white/55">
          <span className="font-display text-lg text-white/70">{index}</span>
        </p>
        <h3 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">{title}</h3>
        <div className="mt-3 max-w-sm text-[15px] leading-relaxed text-white/70">{body}</div>
      </SpotlightCard>
    </motion.div>
  )
}

/** Local search results: your listing springs to the top. */
function RankingDemo() {
  const rows = ['Competitor A', 'Competitor B', 'Competitor C']
  return (
    <div className="space-y-2">
      <motion.div
        initial={{ y: 3 * 52, opacity: 0.6 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={inView}
        transition={{ ...spring, delay: 0.3 }}
        className="relative z-10 flex items-center justify-between rounded-2xl border border-[#4080E0]/60 bg-[#4080E0]/15 px-4 py-3 shadow-[0_12px_40px_-12px_rgba(64,128,224,0.9)]"
      >
        <span className="flex items-center gap-3 text-sm font-semibold text-white">
          <span className="font-display text-lg text-[#dbe6ff]">1</span>
          Your business
        </span>
        <span className="text-xs text-[#b9cdf3]">★ 4.9 · Book now</span>
      </motion.div>
      {rows.map((r, i) => (
        <motion.div
          key={r}
          initial={{ y: -52, opacity: 0.6 }}
          whileInView={{ y: 0, opacity: 0.6 }}
          viewport={inView}
          transition={{ ...spring, delay: 0.3 }}
          className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
        >
          <span className="flex items-center gap-3 text-sm text-white/60">
            <span className="font-display text-lg text-white/40">{i + 2}</span>
            {r}
          </span>
          <span className="h-1.5 w-16 rounded-full bg-white/10" />
        </motion.div>
      ))}
    </div>
  )
}

/** Visit → pick a time → booked, with no dead ends. */
function FlowDemo() {
  const steps = ['Visit', 'Pick a time', 'Booked']
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s} className="flex flex-1 items-center gap-2 last:flex-none">
          <motion.span
            initial={{ opacity: 0.35, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={inView}
            transition={{ ...spring, delay: 0.2 + i * 0.35 }}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
              i === steps.length - 1 ? 'bg-white font-semibold text-[#04101e]' : 'border border-white/15 bg-white/[0.04] text-white/80'
            }`}
          >
            {i === steps.length - 1 && <Check className="h-3 w-3" />}
            {s}
          </motion.span>
          {i < steps.length - 1 && (
            <motion.span
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={inView}
              transition={{ duration: 0.4, delay: 0.35 + i * 0.35 }}
              className="h-px flex-1 origin-left bg-[#4080E0]"
            />
          )}
        </div>
      ))}
    </div>
  )
}

/** Page load that finishes in under a second. */
function SpeedDemo() {
  return (
    <div>
      <div className="flex justify-between text-[13px] text-white/55">
        <span>Load time</span>
        <span className="tabular-nums text-white/85">0.8s</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          initial={{ width: '0%' }}
          whileInView={{ width: '100%' }}
          viewport={inView}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-[#4080E0] to-[#9ec0f5]"
        />
      </div>
    </div>
  )
}

export function WhatWeBuild() {
  return (
    <section id="build-what" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading index="04" label="What we build" title="Sites that sell *before* you speak." className="mb-12" />

        <div className="grid gap-4 md:grid-cols-3 md:grid-rows-2">
          <Card
            index="01"
            title="Instant credibility"
            body="Look like the undisputed market leader in your niche."
            className="md:col-span-2 md:row-span-2"
          >
            <RankingDemo />
          </Card>
          <Card index="02" title="Zero-friction UX" body="Guide visitors to your booking form without a single drop-off.">
            <FlowDemo />
          </Card>
          <Card index="03" title="Lightning speed" body="Sub-second load times that keep mobile users hooked.">
            <SpeedDemo />
          </Card>
        </div>
      </div>
    </section>
  )
}
