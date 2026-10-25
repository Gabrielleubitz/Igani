'use client'

import { MouseEvent, ReactNode, useRef } from 'react'
import { motion, useSpring } from 'framer-motion'

/** Card that lifts on a soft spring; a small gold cursor ring replaces the pointer inside it. */
function Card({ numeral, title, body, className = '', children }: { numeral: string; title: string; body: string; className?: string; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const cx = useSpring(0, { stiffness: 350, damping: 30 })
  const cy = useSpring(0, { stiffness: 350, damping: 30 })
  const ring = useSpring(0, { stiffness: 200, damping: 25 })

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    cx.set(e.clientX - r.left)
    cy.set(e.clientY - r.top)
    ring.set(1)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => ring.set(0)}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className={`group relative flex flex-col overflow-hidden border border-[#E2D9CB] bg-[#FBF8F3] p-8 transition-shadow duration-700 hover:shadow-[0_30px_60px_-30px_rgba(60,45,25,0.35)] sm:p-10 [@media(pointer:fine)]:cursor-none ${className}`}
    >
      <motion.span
        aria-hidden
        style={{ x: cx, y: cy, opacity: ring }}
        className="pointer-events-none absolute left-0 top-0 z-20 -ml-4 -mt-4 hidden h-8 w-8 rounded-full border border-[#A9845A] [@media(pointer:fine)]:block"
      />
      <span className="font-cormorant text-2xl italic text-[#A9845A]">{numeral}</span>
      {children}
      <div className="mt-auto pt-10">
        <h3 className="font-cormorant text-3xl font-medium tracking-wide text-[#1F1C18] sm:text-4xl">{title}</h3>
        <div className="mt-3 h-px w-12 bg-[#A9845A] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-28" />
        <div className="mt-4 max-w-sm leading-relaxed text-[#6E665C]">{body}</div>
      </div>
    </motion.div>
  )
}

export function WhatWeBuild() {
  return (
    <section className="px-6 py-28 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 max-w-xl">
          <span className="text-[11px] uppercase tracking-[0.4em] text-[#A9845A]">III. What we build</span>
          <h2 className="mt-6 border-0 pb-0 font-cormorant text-5xl font-normal leading-tight text-[#1F1C18] sm:text-6xl">
            Sites that sell <em>before you speak.</em>
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3 md:grid-rows-2">
          <Card
            numeral="i."
            title="Instant credibility"
            body="Look like the undisputed market leader in your niche."
            className="min-h-[360px] md:col-span-2 md:row-span-2 md:min-h-[540px]"
          >
            <div className="mt-8 flex flex-1 items-center justify-center">
              <div className="aspect-[3/4] w-40 rounded-t-full bg-[radial-gradient(circle_at_40%_30%,#E8D6BC,#C9AE8A_55%,#9C7F5C)] transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04] sm:w-52" />
            </div>
          </Card>
          <Card numeral="ii." title="Effortless flow" body="Guide visitors to your booking form without a single drop-off." className="min-h-[260px]" />
          <Card numeral="iii." title="Swift by nature" body="Sub-second load times that keep mobile visitors with you." className="min-h-[260px]" />
        </div>
      </div>
    </section>
  )
}
