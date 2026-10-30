'use client'

import { MouseEvent, ReactNode, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

/** Bento card: springy 3D tilt and a glowing cursor ring that replaces the pointer inside it. */
function BentoCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const cx = useSpring(0, { stiffness: 500, damping: 35 })
  const cy = useSpring(0, { stiffness: 500, damping: 35 })
  const ringOpacity = useSpring(0, { stiffness: 300, damping: 30 })
  const rotX = useSpring(useTransform(my, [0, 1], [5, -5]), { stiffness: 200, damping: 18 })
  const rotY = useSpring(useTransform(mx, [0, 1], [-6, 6]), { stiffness: 200, damping: 18 })

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width)
    my.set((e.clientY - r.top) / r.height)
    cx.set(e.clientX - r.left)
    cy.set(e.clientY - r.top)
    ringOpacity.set(1)
  }
  const onLeave = () => {
    mx.set(0.5)
    my.set(0.5)
    ringOpacity.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rotX, rotateY: rotY, transformPerspective: 900 }}
      className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-xl transition-colors duration-500 hover:border-[#00F0FF]/40 [@media(pointer:fine)]:cursor-none ${className}`}
    >
      <motion.span
        aria-hidden
        style={{ x: cx, y: cy, opacity: ringOpacity }}
        className="pointer-events-none absolute left-0 top-0 z-20 -ml-5 -mt-5 hidden h-10 w-10 rounded-full border border-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.7)] [@media(pointer:fine)]:block"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#00F0FF]/0 to-[#7000FF]/0 transition-all duration-500 group-hover:from-[#00F0FF]/[0.06] group-hover:to-[#7000FF]/[0.12]" />
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </motion.div>
  )
}

function Title({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-auto">
      <h3 className="font-clash text-2xl font-semibold tracking-wide text-white sm:text-3xl">{title}</h3>
      <p className="mt-2 max-w-sm text-white/60">{body}</p>
    </div>
  )
}

const spring = { type: 'spring', stiffness: 260, damping: 20 } as const

export function BentoBuild() {
  return (
    <section className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#00F0FF]">What we build</p>
          <h2 className="mt-4 border-0 pb-0 font-clash text-4xl font-bold text-white sm:text-5xl">Sites that sell before you speak.</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3 md:grid-rows-2">
          <BentoCard className="min-h-[340px] md:col-span-2 md:row-span-2 md:min-h-[520px]">
            {/* Market-leader ranking: your bar springs to the top on hover */}
            <div className="mb-10 flex h-48 items-end gap-3 sm:h-64">
              {[38, 52, 44, 30].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-xl bg-white/10" style={{ height: `${h}%` }} />
              ))}
              <motion.div
                initial={{ height: '46%' }}
                whileInView={{ height: '92%' }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ ...spring, delay: 0.2 }}
                className="relative flex-1 rounded-t-xl bg-gradient-to-t from-[#7000FF] to-[#00F0FF] shadow-[0_0_40px_rgba(0,240,255,0.45)] transition-transform duration-300 group-hover:scale-y-[1.04] origin-bottom"
              >
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] text-[#00F0FF]">
                  You
                </span>
              </motion.div>
            </div>
            <Title title="INSTANT CREDIBILITY" body="Look like the undisputed market leader in your niche." />
          </BentoCard>

          <BentoCard className="min-h-[250px]">
            {/* Visitor dot glides straight to the booking button */}
            <div className="relative mb-8 h-16">
              <div className="absolute left-0 right-16 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-white/5 via-white/30 to-[#00F0FF]" />
              <span className="absolute left-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_white] transition-[left] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:left-[calc(100%-5.5rem)]" />
              <span className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full border border-[#00F0FF]/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#00F0FF] transition-shadow duration-500 group-hover:shadow-[0_0_24px_rgba(0,240,255,0.6)]">
                Book
              </span>
            </div>
            <Title title="ZERO-FRICTION UX" body="Guide visitors to your booking form without a single drop-off." />
          </BentoCard>

          <BentoCard className="min-h-[250px]">
            {/* Load bar that snaps full in under a second */}
            <div className="mb-8">
              <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                <span>Load</span>
                <span className="text-[#00F0FF]">0.8s</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-1/4 rounded-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF] transition-[width] duration-[800ms] ease-out group-hover:w-full" />
              </div>
            </div>
            <Title title="LIGHTNING SPEED" body="Sub-second load times that keep mobile users hooked." />
          </BentoCard>
        </div>
      </div>
    </section>
  )
}
