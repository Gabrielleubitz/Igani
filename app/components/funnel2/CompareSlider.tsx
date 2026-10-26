'use client'

import { KeyboardEvent, PointerEvent, useCallback, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useCaseStudy } from '@/app/components/funnel-shared/useCaseStudy'
import { Screenshot } from '@/app/components/funnel-shared/Screenshot'

/** Deliberately dated mock site: flat greys, clutter, bevels. */
function DatedSite({ name = 'Arden Interiors' }: { name?: string }) {
  return (
    <div className="absolute inset-0 bg-[#d6d6d6] p-4 font-serif text-[#222] sm:p-6">
      <div className="flex items-center justify-between border-b-4 border-double border-[#777] pb-2">
        <span className="text-lg font-bold text-[#1a3c8a] sm:text-2xl">{name}</span>
      </div>
      <div className="mt-3 overflow-hidden whitespace-nowrap bg-[#ffff99] px-2 py-1 text-xs text-[#b00]">
        ★★★ WELCOME!!! CALL NOW FOR A FREE QUOTE ★★★
      </div>
      <div className="mt-4 w-1/2 space-y-4 pr-4">
        <div className="flex flex-wrap gap-1">
          {['Home', 'Services', 'Gallery', 'Guestbook'].map((l) => (
            <div key={l} className="border-2 border-b-[#555] border-l-white border-r-[#555] border-t-white bg-[#c0c0c0] px-2 py-1 text-xs">
              {l}
            </div>
          ))}
        </div>
        <div className="text-sm font-bold sm:text-base">We Are The Best In Town!</div>
        <div className="text-[11px] leading-snug text-[#444] sm:text-xs">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Serving customers since 2009. Best viewed in 1024x768.
        </div>
        <div className="h-16 w-full border border-[#888] bg-gradient-to-b from-[#eee] to-[#aaa] sm:h-24" />
      </div>
      <span className="absolute bottom-4 left-4 hidden text-[10px] sm:inline uppercase tracking-[0.25em] text-[#666] sm:bottom-6 sm:left-6">
        Outdated · Ordinary · Ignored
      </span>
    </div>
  )
}

/** Refined mock: ivory, serif, space. */
function RefinedSite({ name = 'Arden' }: { name?: string }) {
  return (
    <div className="absolute inset-0 bg-[#FBF8F3] p-4 text-[#1F1C18] sm:p-6">
      <div className="flex items-center justify-between border-b border-[#E2D9CB] pb-3">
        <span className="ml-auto font-cormorant text-xl italic sm:text-2xl">{name}</span>
      </div>
      <div className="ml-auto mt-8 w-1/2 pl-4 sm:mt-12">
        <span className="text-[9px] uppercase tracking-[0.3em] text-[#A9845A] sm:text-[10px]">Interiors · London</span>
        <div className="mt-3 font-cormorant text-3xl leading-[1.05] sm:text-5xl">
          Rooms that
          <br />
          <em>feel considered.</em>
        </div>
        <div className="mt-6 inline-block border border-[#1F1C18] px-4 py-2 text-[9px] uppercase tracking-[0.3em] sm:px-5 sm:text-[10px]">
          Book a consultation
        </div>
        <div className="mt-6 hidden aspect-[16/7] w-full rounded-t-[999px] bg-[radial-gradient(circle_at_40%_30%,#E8D6BC,#C9AE8A_55%,#9C7F5C)] sm:block" />
      </div>
      <span className="absolute bottom-4 right-4 hidden text-[10px] sm:inline uppercase tracking-[0.25em] text-[#A9845A] sm:bottom-6 sm:right-6">
        Instant authority
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
    <section className="px-6 py-28 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-14 max-w-2xl text-center"
        >
          <span className="text-[11px] uppercase tracking-[0.4em] text-[#A9845A]">I. The reason</span>
          <h2 className="mt-6 border-0 pb-0 font-cormorant text-5xl font-normal text-[#1F1C18] sm:text-6xl">
            Design is <em>trust.</em>
          </h2>
          <div className="mt-5 text-lg leading-relaxed text-[#6E665C]">
            Before they read your copy, they&rsquo;ve already decided if you&rsquo;re expensive or cheap.
          </div>
        </motion.div>

        <div className="mb-4 flex justify-between text-[10px] uppercase tracking-[0.3em] text-[#6E665C]">
          <span>{cs ? `Before · ${cs.before.caption}` : 'Before'}</span>
          <span className="text-[#A9845A]">{cs ? `After · ${cs.after.caption}` : 'After'}</span>
        </div>

        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          className={`relative aspect-[4/5] w-full touch-pan-y select-none overflow-hidden border border-[#E2D9CB] shadow-[0_40px_80px_-40px_rgba(60,45,25,0.35)] sm:aspect-[16/9] ${
            dragging ? 'cursor-grabbing' : 'cursor-ew-resize'
          }`}
        >
          {cs?.after.image ? (
            <Screenshot src={cs.after.image} mobileSrc={cs.after.mobileImage} alt={`${cs.client} — ${cs.after.caption}`} />
          ) : (
            <RefinedSite name={cs?.client} />
          )}
          <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
            {cs?.before.image ? (
              <Screenshot src={cs.before.image} mobileSrc={cs.before.mobileImage} alt={`${cs.client} — ${cs.before.caption}`} />
            ) : (
              <DatedSite name={cs?.client} />
            )}
          </div>

          <div className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-[#A9845A]" style={{ left: `${pos}%` }} />
          <div
            role="slider"
            tabIndex={0}
            aria-label="Compare dated and refined design"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pos)}
            onKeyDown={onKeyDown}
            className={`absolute top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#A9845A] bg-[#FBF8F3] font-cormorant text-xl italic text-[#1F1C18] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[#A9845A] ${
              dragging ? 'scale-110' : 'hover:scale-110'
            } shadow-[0_10px_30px_-10px_rgba(60,45,25,0.5)]`}
            style={{ left: `${pos}%` }}
          >
            <span aria-hidden>⟷</span>
          </div>
        </div>

        {cs && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 grid gap-6 border-t border-[#D8CCBA] pt-6 sm:grid-cols-[1fr_auto] sm:items-end"
          >
            <div>
              <div className="text-[10px] uppercase tracking-[0.35em] text-[#A9845A]">A real project · built by Igani</div>
              <div className="mt-3 font-cormorant text-4xl text-[#1F1C18]">{cs.client}</div>
              <div className="mt-1 text-sm text-[#6E665C]">
                {cs.industry}
                {cs.location ? ` · ${cs.location}` : ''}
              </div>
              {cs.quote && (
                <blockquote className="mt-4 max-w-md font-cormorant text-xl italic leading-snug text-[#4A443D]">
                  &ldquo;{cs.quote.text}&rdquo;
                  <span className="mt-1 block font-sans text-xs not-italic tracking-wide text-[#6E665C]">
                    — {cs.quote.author}
                    {cs.quote.role ? `, ${cs.quote.role}` : ''}
                  </span>
                </blockquote>
              )}
            </div>
            <div className="flex flex-wrap items-end gap-6">
              {cs.results.map((r) => (
                <div key={r.label}>
                  <div className="font-cormorant text-4xl text-[#1F1C18]">{r.value}</div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-[#6E665C]">{r.label}</div>
                </div>
              ))}
              {cs.url && (
                <a
                  href={cs.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-b border-[#1F1C18] pb-1 text-[11px] uppercase tracking-[0.32em] text-[#1F1C18] transition-colors hover:border-[#A9845A] hover:text-[#A9845A]"
                >
                  Visit the site ↗
                </a>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
