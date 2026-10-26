'use client'

import { KeyboardEvent, PointerEvent, useCallback, useRef, useState } from 'react'
import { SectionHeading } from '@/app/components/landing/fx/SectionHeading'
import { SideNote } from '@/app/components/landing/fx/SideNote'

/** Deliberately dated mock site: flat greys, clutter, bevels. */
function DatedSite() {
  return (
    <div className="absolute inset-0 bg-[#d6d6d6] p-4 font-serif text-[#222] sm:p-6">
      <div className="border-b-4 border-double border-[#777] pb-2 text-lg font-bold text-[#1a3c8a] sm:text-2xl">Smith &amp; Co. Services</div>
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
function ModernSite() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#030814] p-4 text-white sm:p-6">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#4080E0]/30 blur-[90px]" />
      <div className="relative flex items-center justify-end border-b border-white/[0.08] pb-3">
        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-[#04101e] sm:text-xs">Book a call</span>
      </div>
      <div className="relative ml-auto mt-8 w-1/2 pl-4 sm:mt-12">
        <span className="text-xs text-white/55">smith/co · services</span>
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

export function CompareSlider() {
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
    <section id="reason" className="relative scroll-mt-20 border-t border-white/[0.06] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          index="01"
          label="The reason"
          aside="drag the line"
          title="Design is *trust*."
          sub="Before they read your copy, they’ve already decided if you’re expensive or cheap."
          className="mb-12"
        />
        <div className="mb-4 hidden sm:block [@media(pointer:coarse)]:!hidden">
          <SideNote arrow="down">go on, drag it</SideNote>
        </div>

        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          className={`relative aspect-[4/5] w-full touch-pan-y select-none overflow-hidden rounded-[28px] border border-white/[0.08] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] sm:aspect-[16/9] ${
            dragging ? 'cursor-grabbing' : 'cursor-ew-resize'
          }`}
        >
          <ModernSite />
          <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
            <DatedSite />
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

        <div className="mt-4 flex justify-between text-[13px] text-white/50">
          <span>Ugly · low trust</span>
          <span className="text-white/80">Modern · high conversion</span>
        </div>
      </div>
    </section>
  )
}
