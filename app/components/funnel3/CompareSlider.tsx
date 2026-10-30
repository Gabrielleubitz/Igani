'use client'

import { KeyboardEvent, PointerEvent, useCallback, useEffect, useRef, useState } from 'react'
import { SectionHeading } from '@/app/components/landing/fx/SectionHeading'
import { SideNote } from '@/app/components/landing/fx/SideNote'
import { ArrowUpRight } from 'lucide-react'
import { AnimationPlaybackControls, animate, motion, useInView } from 'framer-motion'
import { useReducedMotionSafe } from '@/app/components/funnel-shared/useReducedMotionSafe'
import { useCaseStudy } from '@/app/components/funnel-shared/useCaseStudy'
import { Screenshot } from '@/app/components/funnel-shared/Screenshot'

/** Deliberately dated mock site: flat greys, clutter, bevels. */
function DatedSite({ name = 'Smith & Co.' }: { name?: string }) {
  return (
    <div className="absolute inset-0 bg-[#d6d6d6] p-4 font-serif text-[#222] sm:p-6">
      <div className="border-b-4 border-double border-[#777] pb-2 text-lg font-bold text-[#1a3c8a] sm:text-2xl">{name} Services</div>
      <div className="mt-3 overflow-hidden whitespace-nowrap bg-[#ffff99] px-2 py-1 text-xs text-[#b00]">
        ★★★ WELCOME TO OUR WEBSITE!!! CALL NOW FOR A FREE QUOTE ★★★
      </div>
      <div className="mt-4 w-1/2 space-y-4 pr-4">
        <div className="flex flex-wrap gap-1">
          {['Home', 'Services', 'Gallery', 'Guestbook'].map((l) => (
            <div key={l} className="border-2 border-b-[#555] border-l-white border-r-[#555] border-t-white bg-[#c0c0c0] px-2 py-1 text-xs">
              {l}
            </div>
          ))}
        </div>
        <div className="text-sm font-bold sm:text-base">We Are The Best In The Business!</div>
        <div className="text-[11px] leading-snug text-[#444] sm:text-xs">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Serving customers since 2009. Best viewed in 1024x768.
        </div>
        <div className="h-16 w-full border border-[#888] bg-gradient-to-b from-[#eee] to-[#aaa] sm:h-24" />
      </div>
      <span className="absolute bottom-4 left-4 hidden text-xs text-[#666] sm:bottom-6 sm:left-6 sm:inline">Outdated. Boring. Ignored.</span>
    </div>
  )
}

/** The Igani look: deep navy, glass cards, serif italic accent. */
function ModernSite({ name = 'smith/co' }: { name?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#030814] p-4 text-white sm:p-6">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#4080E0]/30 blur-[90px]" />
      <div className="relative flex items-center justify-end border-b border-white/[0.08] pb-3">
        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-[#04101e] sm:text-xs">Book a call</span>
      </div>
      <div className="relative ml-auto mt-8 w-1/2 pl-4 sm:mt-12">
        <span className="text-xs text-white/55">{name.toLowerCase()} · services</span>
        <div className="mt-3 text-3xl font-semibold leading-[1] tracking-[-0.03em] sm:text-5xl">
          Service that feels <span className="font-display font-normal text-[#dbe6ff]">premium</span>
          <span className="text-[#4080E0]">.</span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {['4.9★', '1.2k+', '<1s'].map((s) => (
            <div key={s} className="rounded-2xl border border-white/[0.08] bg-[#061225]/80 p-2 backdrop-blur sm:p-3">
              <div className="text-base font-semibold sm:text-xl">{s}</div>
              <div className="mt-1 h-1.5 w-2/3 rounded-full bg-[#4080E0]/40" />
            </div>
          ))}
        </div>
      </div>
      <span className="absolute bottom-4 right-4 hidden font-display text-lg text-[#b9cdf3] sm:bottom-6 sm:right-6 sm:inline">instant authority.</span>
    </div>
  )
}

type Heading = { index: string; label: string; aside?: string; title: string; sub?: string }

const DEFAULT_HEADING: Heading = {
  index: '01',
  label: 'The reason',
  aside: 'drag the line',
  title: 'Design is *trust*.',
  sub: 'Before they read your copy, they’ve already decided if you’re expensive or cheap.',
}

/** Before/after of a real project. `heading` and `caption` let other funnels tell it their way. */
export function CompareSlider({ heading = DEFAULT_HEADING, caption }: { heading?: Heading; caption?: string } = {}) {
  const cs = useCaseStudy()
  // Desktop captures with no phone versions: keep the frame 16:9 on phones too, so the whole screen shows
  const desktopShotsOnly = Boolean(cs?.before.image && cs.after.image && !cs.before.mobileImage && !cs.after.mobileImage)
  const frameRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(50)
  const [dragging, setDragging] = useState(false)
  const reduce = useReducedMotionSafe()
  const inView = useInView(frameRef, { once: true, amount: 0.6 })
  const motionRef = useRef<AnimationPlaybackControls | null>(null)
  const touchedRef = useRef(false)
  // Touch gesture bookkeeping: a touch only moves the line once it is clearly horizontal, so vertical scrolls pass through
  const gestureRef = useRef<{ x: number; y: number; type: string; moved: boolean } | null>(null)

  const posRef = useRef(50)
  posRef.current = pos

  const glideTo = useCallback(
    (to: number | number[], duration = 0.6) => {
      motionRef.current?.stop()
      const target = Array.isArray(to) ? to[to.length - 1] : to
      if (reduce) {
        setPos(target)
        return
      }
      motionRef.current = animate(posRef.current, to, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: setPos })
    },
    [reduce]
  )

  const takeControl = () => {
    touchedRef.current = true
    motionRef.current?.stop()
  }

  // One gentle sweep the first time it's seen, so it's obvious the line moves
  useEffect(() => {
    if (!inView || touchedRef.current || reduce) return
    const id = window.setTimeout(() => !touchedRef.current && glideTo([22, 78, 50], 2.6), 500)
    return () => window.clearTimeout(id)
  }, [inView, reduce, glideTo])

  const setFromClientX = useCallback((clientX: number) => {
    const el = frameRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)))
  }, [])

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    takeControl()
    gestureRef.current = { x: e.clientX, y: e.clientY, type: e.pointerType, moved: false }
    if (e.pointerType === 'touch') return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    setFromClientX(e.clientX)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current
    if (g?.type === 'touch' && !dragging) {
      const dx = Math.abs(e.clientX - g.x)
      const dy = Math.abs(e.clientY - g.y)
      if (dx > 8 || dy > 8) g.moved = true
      if (dx > 8 && dx > dy) {
        e.currentTarget.setPointerCapture(e.pointerId)
        setDragging(true)
      }
      return
    }
    if (dragging) setFromClientX(e.clientX)
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current
    // A clean tap on touch jumps the line to that spot
    if (g?.type === 'touch' && !dragging && !g.moved) glideTo(((e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.getBoundingClientRect().width) * 100, 0.4)
    gestureRef.current = null
    setDragging(false)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    takeControl()
    if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 5))
    if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 5))
    if (e.key === 'Home') setPos(0)
    if (e.key === 'End') setPos(100)
  }

  return (
    <section id="reason" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading {...heading} className="mb-12" />
        <div className="mb-4 hidden sm:block [@media(pointer:coarse)]:!hidden">
          <SideNote arrow="down">go on, drag it</SideNote>
        </div>

        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            gestureRef.current = null
            setDragging(false)
          }}
          className={`relative ${desktopShotsOnly ? 'aspect-[16/9]' : 'aspect-[4/5]'} w-full touch-pan-y select-none overflow-hidden rounded-[28px] border border-white/[0.08] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] sm:aspect-[16/9] ${
            dragging ? 'cursor-grabbing' : 'cursor-ew-resize'
          }`}
        >
          {cs?.after.image ? (
            <Screenshot src={cs.after.image} mobileSrc={cs.after.mobileImage} alt={`${cs.client} — ${cs.after.caption}`} />
          ) : (
            <ModernSite name={cs?.client} />
          )}
          <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
            {cs?.before.image ? (
              <Screenshot src={cs.before.image} mobileSrc={cs.before.mobileImage} alt={`${cs.client} — ${cs.before.caption}`} />
            ) : (
              <DatedSite name={cs?.client} />
            )}
          </div>

          <div className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-[#4080E0] shadow-[0_0_16px_rgba(64,128,224,0.9)]" style={{ left: `${pos}%` }} />
          <div
            role="slider"
            tabIndex={0}
            aria-label="Compare outdated and modern design"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pos)}
            onKeyDown={onKeyDown}
            className={`absolute top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#04101e] shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_12px_40px_-12px_rgba(64,128,224,0.9)] transition-transform duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4080E0] ${
              dragging ? 'scale-110' : 'hover:scale-110'
            }`}
            style={{ left: `${pos}%` }}
          >
            <span aria-hidden className="text-sm font-semibold">‹ ›</span>
          </div>
        </div>

        {/* Snap buttons: a no-drag way to compare, especially on phones */}
        <div className="mt-4 flex items-center justify-between gap-3 text-[13px]">
          <button
            type="button"
            onClick={() => {
              takeControl()
              glideTo(100)
            }}
            aria-pressed={pos > 95}
            className={`rounded-full border px-4 py-2 transition-colors ${pos > 95 ? 'border-white/40 bg-white/10 text-white' : 'border-white/10 text-white/55 hover:text-white'}`}
          >
            ← {cs ? `Before · ${cs.before.caption}` : 'Before'}
          </button>
          <span className="hidden text-white/35 sm:inline">{cs ? '' : 'ugly · low trust vs. modern · high conversion'}</span>
          <button
            type="button"
            onClick={() => {
              takeControl()
              glideTo(0)
            }}
            aria-pressed={pos < 5}
            className={`rounded-full border px-4 py-2 transition-colors ${pos < 5 ? 'border-white/40 bg-white/10 text-white' : 'border-white/10 text-white/80 hover:text-white'}`}
          >
            {cs ? `After · ${cs.after.caption}` : 'After'} →
          </button>
        </div>

        {cs && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 flex flex-col gap-5 rounded-3xl border border-white/[0.08] bg-[#030814]/60 p-6 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-7"
          >
            <div>
              <div className="flex items-baseline gap-3 text-[13px] text-white/55">
                <span className="font-display text-lg leading-none text-white/80">case</span>
                a real project, built by us
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-white">{cs.client}</div>
              <div className="text-sm text-white/55">
                {cs.industry}
                {cs.location ? ` · ${cs.location}` : ''}
              </div>
              {caption && <p className="!mt-3 max-w-md text-[15px] leading-relaxed text-white/80">{caption}</p>}
              {cs.quote && (
                <blockquote className="mt-3 max-w-md font-display text-lg leading-snug text-[#dbe6ff]">
                  &ldquo;{cs.quote.text}&rdquo;
                  <span className="mt-1 block font-sans text-xs text-white/50">
                    — {cs.quote.author}
                    {cs.quote.role ? `, ${cs.quote.role}` : ''}
                  </span>
                </blockquote>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {cs.results.map((r) => (
                <div key={r.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-2">
                  <div className="text-xl font-semibold text-white">{r.value}</div>
                  <div className="text-xs text-white/55">{r.label}</div>
                </div>
              ))}
              {cs.url && (
                <a
                  href={cs.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#04101e] transition-colors hover:bg-[#e6eefc]"
                >
                  See it live <ArrowUpRight className="h-4 w-4" />
                </a>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
