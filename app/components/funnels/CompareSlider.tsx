'use client'

import { KeyboardEvent, PointerEvent, useCallback, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { useCaseStudy } from '@/app/components/funnel-shared/useCaseStudy'
import { Screenshot } from '@/app/components/funnel-shared/Screenshot'

/** Deliberately dated mock site: flat greys, serif, bevels, clutter. */
function UglySite({ name = 'Smith & Co.' }: { name?: string }) {
  return (
    <div className="absolute inset-0 bg-[#d9d9d9] p-4 font-serif text-[#222] sm:p-6">
      <div className="flex items-center justify-between border-b-4 border-double border-[#777] pb-2">
        <span className="text-lg font-bold text-[#1a3c8a] sm:text-2xl">{name} Services</span>
        <span className="hidden text-xs underline text-[#0000ee] sm:inline">Home | About | Contact Us | Links</span>
      </div>
      <div className="mt-3 overflow-hidden whitespace-nowrap bg-[#ffff99] px-2 py-1 text-xs text-[#b00]">
        ★★★ WELCOME TO OUR WEBSITE!!! CALL NOW FOR A FREE QUOTE ★★★
      </div>
      <div className="mt-4 w-1/2 space-y-4 pr-4">
        <div className="flex flex-wrap gap-1">
          {['Services', 'Pricing', 'Gallery', 'Testimonials', 'Guestbook'].map((l) => (
            <div key={l} className="border-2 border-b-[#555] border-l-white border-r-[#555] border-t-white bg-[#c0c0c0] px-2 py-1 text-xs">
              {l}
            </div>
          ))}
        </div>
        <div>
          <p className="text-sm font-bold sm:text-base">We Are The Best In The Business!</p>
          <p className="mt-2 text-[11px] leading-snug text-[#444] sm:text-xs">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. We have been providing quality service since 2009. Please browse our website for more information. Best viewed in 1024x768.
          </p>
          <div className="mt-3 h-16 w-full border border-[#888] bg-gradient-to-b from-[#eee] to-[#aaa] sm:h-24" />
          <div className="mt-3 inline-block border-2 border-b-[#555] border-l-white border-r-[#555] border-t-white bg-[#c0c0c0] px-3 py-1 text-xs">
            Click Here
          </div>
        </div>
      </div>
      <span className="absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#666] sm:bottom-6 sm:left-6">
        Outdated. Boring. Ignored.
      </span>
    </div>
  )
}

/** Fluid modern mock: dark glass, bold type, glow. */
function ModernSite({ name = 'smith/co' }: { name?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0A0A0C] p-4 text-white sm:p-6">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#7000FF]/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-[#00F0FF]/25 blur-3xl" />
      <div className="relative flex items-center justify-between">
        <span className="font-clash text-lg font-semibold sm:text-xl">{name}</span>
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] backdrop-blur">
          Book a call
        </span>
      </div>
      <div className="relative ml-auto mt-8 w-1/2 pl-4 sm:mt-12">
        <p className="font-clash text-3xl font-bold leading-[0.95] sm:text-5xl">
          Service that
          <br />
          <span className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF] bg-clip-text text-transparent">feels premium.</span>
        </p>
        <div className="mt-6 inline-flex rounded-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF] px-5 py-2 text-xs font-semibold text-[#0A0A0C] shadow-[0_0_30px_rgba(0,240,255,0.5)]">
          Get started →
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {['4.9★', '1.2k+', '<1s'].map((s) => (
            <div key={s} className="rounded-xl border border-white/10 bg-white/[0.04] p-2 backdrop-blur sm:p-3">
              <p className="font-clash text-base font-semibold sm:text-xl">{s}</p>
              <div className="mt-1 h-1.5 w-2/3 rounded-full bg-white/15" />
            </div>
          ))}
        </div>
      </div>
      <span className="absolute bottom-4 right-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#00F0FF] sm:bottom-6 sm:right-6">
        Instant authority.
      </span>
    </div>
  )
}

export function CompareSlider() {
  const cs = useCaseStudy()
  const frameRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(50)
  const [dragging, setDragging] = useState(false)

  const setFromClientX = useCallback((clientX: number) => {
    const el = frameRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)))
  }, [])

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    setFromClientX(e.clientX)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging) setFromClientX(e.clientX)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 5))
    if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 5))
    if (e.key === 'Home') setPos(0)
    if (e.key === 'End') setPos(100)
  }

  return (
    <section className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mb-10 max-w-2xl text-center"
        >
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#00F0FF]">The reason</p>
          <h2 className="mt-4 border-0 pb-0 font-clash text-5xl font-bold text-white sm:text-6xl">Design is trust.</h2>
          <p className="mt-4 text-lg text-white/60">
            Before they read your copy, they&rsquo;ve already decided if you&rsquo;re expensive or cheap.
          </p>
        </motion.div>

        <div className="mb-3 flex justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 sm:text-xs">
          <span>{cs ? `Before · ${cs.before.caption}` : 'Ugly / Low trust'}</span>
          <span className="text-[#00F0FF]/80">{cs ? `After · ${cs.after.caption}` : 'Modern / High conversion'}</span>
        </div>

        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          className={`relative aspect-[4/5] w-full touch-pan-y select-none overflow-hidden rounded-3xl border border-white/10 sm:aspect-[16/9] ${
            dragging ? 'cursor-grabbing' : 'cursor-ew-resize'
          }`}
        >
          {cs?.after.image ? (
            <Screenshot src={cs.after.image} mobileSrc={cs.after.mobileImage} alt={`${cs.client} — ${cs.after.caption}`} />
          ) : (
            <ModernSite name={cs?.client.toLowerCase()} />
          )}
          <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
            {cs?.before.image ? (
              <Screenshot src={cs.before.image} mobileSrc={cs.before.mobileImage} alt={`${cs.client} — ${cs.before.caption}`} />
            ) : (
              <UglySite name={cs?.client} />
            )}
          </div>

          <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}>
            <div className="absolute inset-y-0 -translate-x-1/2 w-0.5 bg-gradient-to-b from-[#00F0FF] to-[#7000FF] shadow-[0_0_18px_rgba(0,240,255,0.8)]" />
          </div>
          <div
            role="slider"
            tabIndex={0}
            aria-label="Compare outdated and modern design"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pos)}
            onKeyDown={onKeyDown}
            className={`absolute top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-[#0A0A0C]/80 text-white backdrop-blur-md transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00F0FF] ${
              dragging ? 'scale-110 shadow-[0_0_40px_rgba(0,240,255,0.7)]' : 'shadow-[0_0_24px_rgba(0,240,255,0.45)] hover:scale-110'
            }`}
            style={{ left: `${pos}%` }}
          >
            <span aria-hidden className="font-mono text-sm">‹ ›</span>
          </div>
        </div>

        {cs && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-6 flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#00F0FF]">Real project · built by Igani</div>
              <div className="mt-2 font-clash text-2xl font-semibold text-white">{cs.client}</div>
              <div className="text-sm text-white/55">
                {cs.industry}
                {cs.location ? ` · ${cs.location}` : ''}
              </div>
              {cs.quote && (
                <blockquote className="mt-3 max-w-md text-sm italic text-white/70">
                  &ldquo;{cs.quote.text}&rdquo; — {cs.quote.author}
                  {cs.quote.role ? `, ${cs.quote.role}` : ''}
                </blockquote>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {cs.results.map((r) => (
                <div key={r.label} className="rounded-2xl border border-white/10 px-4 py-2">
                  <div className="font-clash text-xl font-bold text-white">{r.value}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/50">{r.label}</div>
                </div>
              ))}
              {cs.url && (
                <a
                  href={cs.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#00F0FF]/50 px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-[#00F0FF] transition-colors hover:bg-[#00F0FF]/10"
                >
                  See it live <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
