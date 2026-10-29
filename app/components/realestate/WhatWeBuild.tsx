'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, Check, Home } from 'lucide-react'
import { SectionHeading } from '@/app/components/landing/fx/SectionHeading'
import { SpotlightCard } from '@/app/components/landing/fx/SpotlightCard'
import { useReducedMotionSafe } from '@/app/components/funnel-shared/useReducedMotionSafe'

const spring = { type: 'spring', stiffness: 220, damping: 22 } as const
const inView = { once: true, amount: 0.5 } as const

function Card({ index, title, body, className = '', children }: { index: string; title: string; body: string; className?: string; children: ReactNode }) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={spring} className={className}>
      <SpotlightCard className="flex h-full flex-col p-6 sm:p-8">
        <div className="mb-8 flex flex-1 flex-col justify-center">{children}</div>
        <p className="!mt-0 flex items-baseline gap-3 text-sm text-white/55">
          <span className="font-display text-lg text-white/70">{index}</span>
        </p>
        <h3 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">{title}</h3>
        <div className="mt-3 max-w-md text-[15px] leading-relaxed text-white/70">{body}</div>
      </SpotlightCard>
    </motion.div>
  )
}

const ADDRESS = '24 Oak Hollow Dr'

/** "What's my home worth?": an address types itself in, the request goes, and a new seller lead lands in the CRM. */
function ValuationDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, amount: 0.6 })
  const reduce = useReducedMotionSafe()
  const [typed, setTyped] = useState(0)
  const [stage, setStage] = useState<'typing' | 'sent' | 'lead'>('typing')

  useEffect(() => {
    if (!seen) return
    if (reduce) {
      setTyped(ADDRESS.length)
      setStage('lead')
      return
    }
    let i = 0
    const timers: number[] = []
    const tick = window.setInterval(() => {
      i += 1
      setTyped(i)
      if (i >= ADDRESS.length) {
        window.clearInterval(tick)
        timers.push(window.setTimeout(() => setStage('sent'), 500), window.setTimeout(() => setStage('lead'), 1400))
      }
    }, 70)
    return () => {
      window.clearInterval(tick)
      timers.forEach(window.clearTimeout)
    }
  }, [seen, reduce])

  return (
    <div ref={ref} className="grid gap-4 sm:grid-cols-[1.1fr_1fr] sm:items-center">
      <div className="rounded-2xl border border-white/10 bg-[#061225] p-5">
        <div className="text-lg font-semibold text-white">What&rsquo;s my home worth?</div>
        <div className="mt-1 text-[13px] text-white/50">Free valuation from a local agent</div>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-[15px] text-white">
          <Home className="h-4 w-4 shrink-0 text-[#9ec0f5]" />
          <span className="truncate">
            {ADDRESS.slice(0, typed)}
            {stage === 'typing' && <span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-white" />}
          </span>
        </div>
        <div
          className={`mt-3 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors duration-300 ${
            stage === 'typing' ? 'bg-white text-[#04101e]' : 'bg-[#4080E0] text-white'
          }`}
        >
          {stage === 'typing' ? (
            <>
              Get my estimate <ArrowRight className="h-4 w-4" />
            </>
          ) : (
            <>
              <Check className="h-4 w-4" /> Estimate requested
            </>
          )}
        </div>
      </div>

      <motion.div
        initial={false}
        animate={stage === 'lead' ? { opacity: 1, x: 0 } : { opacity: 0.25, x: 12 }}
        transition={spring}
        className="rounded-2xl border border-[#4080E0]/50 bg-[#4080E0]/10 p-5 shadow-[0_12px_40px_-12px_rgba(64,128,224,0.8)]"
      >
        <div className="flex items-center justify-between text-[12px] text-[#b9cdf3]">
          <span>New lead · just now</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5">Follow Up Boss</span>
        </div>
        <div className="mt-3 text-[15px] font-semibold text-white">Seller lead: {ADDRESS}</div>
        <div className="mt-1 text-[13px] text-white/60">Valuation request · wants to sell in 3–6 months</div>
        <div className="mt-4 flex gap-2 text-[12px]">
          <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-[#04101e]">Call back</span>
          <span className="rounded-full border border-white/15 px-2.5 py-1 text-white/70">Text</span>
        </div>
      </motion.div>
    </div>
  )
}

/** Local search: your listing springs to the top. */
function RankingDemo() {
  const rows = ['Agent A', 'Agent B', 'Agent C']
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
          You
        </span>
        <span className="text-xs text-[#b9cdf3]">★ 4.9 · Request a showing</span>
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

/** A listing, then the request, then confirmed: no dead ends. */
function ShowingDemo() {
  const steps = ['View home', 'Request a showing', 'Requested']
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
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
              className="h-px w-5 origin-left bg-[#4080E0]"
            />
          )}
        </div>
      ))}
    </div>
  )
}

/** Listing tiles that read like a magazine, not a spreadsheet. */
function ListingsDemo() {
  const homes = [
    { img: '/concepts/lux-1.jpg', price: '$1.95M', meta: '4 bd · 3 ba' },
    { img: '/concepts/fam-1.jpg', price: '$689K', meta: '3 bd · 2 ba' },
    { img: '/concepts/lux-3.jpg', price: '$2.4M', meta: '5 bd · 4 ba' },
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {homes.map((h, i) => (
          <motion.div
            key={h.img}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={inView}
            transition={{ ...spring, delay: 0.15 + i * 0.12 }}
            className="overflow-hidden rounded-xl border border-white/10 bg-[#061225]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={h.img} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
            <div className="px-2 py-1.5">
              <div className="text-[13px] font-semibold text-white">{h.price}</div>
              <div className="text-[11px] text-white/50">{h.meta}</div>
            </div>
          </motion.div>
        ))}
      </div>
      <ShowingDemo />
    </div>
  )
}

/** Your name, not your brokerage's logo. */
function BrandDemo() {
  return (
    <div className="flex items-center gap-4">
      <motion.span
        initial={{ rotate: -8, scale: 0.85, opacity: 0.4 }}
        whileInView={{ rotate: 0, scale: 1, opacity: 1 }}
        viewport={inView}
        transition={{ ...spring, delay: 0.2 }}
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white font-display text-2xl text-[#04101e]"
      >
        JR
      </motion.span>
      <div>
        <div className="text-lg font-semibold text-white">Jordan Reyes</div>
        <div className="text-[13px] text-white/55">jordanreyes.com · goes where you go</div>
      </div>
    </div>
  )
}

/** Page load that finishes in under a second. */
function SpeedDemo() {
  return (
    <div>
      <div className="flex justify-between text-[13px] text-white/55">
        <span>Load time on a phone</span>
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

/** 04 — What we build: what agents measure. Listings, leads and brand. */
export function WhatWeBuild() {
  return (
    <section id="build-what" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading index="04" label="What we build" title="Sites that win the listing *before* you walk in." className="mb-12" />

        <div className="grid gap-4 md:grid-cols-3">
          <Card
            index="01"
            title="Leads that land in your CRM."
            body="“What’s my home worth?” and showing-request forms that send every lead straight to Follow Up Boss, kvCORE, or your inbox."
            className="md:col-span-2 md:row-span-2"
          >
            <ValuationDemo />
          </Card>
          <Card index="02" title="Your listings, beautifully." body="IDX/MLS integration, so your listings and your market’s homes look like a magazine, not a spreadsheet.">
            <ListingsDemo />
          </Card>
          <Card index="03" title="Neighborhood pages that rank." body="Local pages that bring in buyers and sellers searching your area on Google.">
            <RankingDemo />
          </Card>
          <Card
            index="04"
            title="A brand that’s yours, not your brokerage’s."
            body="Your name, your face, your story. Take it with you if you ever switch brokerages."
            className="md:col-span-2"
          >
            <BrandDemo />
          </Card>
          <Card index="05" title="Built for phones." body="Most home searches happen on mobile. Sub-second load times keep them scrolling.">
            <SpeedDemo />
          </Card>
        </div>
      </div>
    </section>
  )
}
