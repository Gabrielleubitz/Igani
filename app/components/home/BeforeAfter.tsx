'use client'

import { KeyboardEvent, PointerEvent, useCallback, useEffect, useRef, useState } from 'react'
import { AnimationPlaybackControls, animate, useInView } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { CaseStudy } from '@/lib/funnelCaseStudy'
import { Screenshot } from '@/app/components/funnel-shared/Screenshot'
import { useReducedMotionSafe } from '@/app/components/funnel-shared/useReducedMotionSafe'

/** Stand-in "old site" when no screenshot is set yet. */
function DatedMock({ name }: { name: string }) {
  return (
    <div className="absolute inset-0 bg-[#d6d6d6] p-4 font-serif text-[#222] sm:p-6">
      <div className="border-b-4 border-double border-[#777] pb-2 text-lg font-bold text-[#1a3c8a] sm:text-2xl">{name}</div>
      <div className="mt-3 overflow-hidden whitespace-nowrap bg-[#ffff99] px-2 py-1 text-xs text-[#b00]">
        ★★★ WELCOME TO OUR WEBSITE!!! CALL NOW ★★★
      </div>
      <div className="mt-4 w-1/2 space-y-3 pr-4">
        <div className="flex flex-wrap gap-1">
          {['Home', 'Services', 'Gallery'].map((l) => (
            <div key={l} className="border-2 border-b-[#555] border-l-white border-r-[#555] border-t-white bg-[#c0c0c0] px-2 py-1 text-xs">
              {l}
            </div>
          ))}
        </div>
        <div className="text-sm font-bold">We Are The Best!</div>
        <div className="h-14 w-full border border-[#888] bg-gradient-to-b from-[#eee] to-[#aaa] sm:h-20" />
      </div>
    </div>
  )
}

/** Stand-in "new site" when no screenshot is set yet. */
function ModernMock({ name }: { name: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#030814] p-4 text-white sm:p-6">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#4080E0]/30 blur-[90px]" />
      <div className="relative flex justify-end border-b border-white/[0.08] pb-3">
        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-[#04101e] sm:text-xs">Book a call</span>
      </div>
      <div className="relative ml-auto mt-8 w-1/2 pl-4 sm:mt-12">
        <span className="text-xs text-white/55">{name}</span>
        <div className="mt-3 text-2xl font-semibold leading-[1] tracking-[-0.03em] sm:text-4xl">
          Service that feels <span className="font-display font-normal text-[#dbe6ff]">premium</span>
          <span className="text-[#4080E0]">.</span>
        </div>
      </div>
    </div>
  )
}

/**
 * One project's before/after. Drag the line, tap to jump (touch: only a clear
 * sideways drag moves it, so vertical scrolling passes through), or use the
 * Before / After buttons. Sweeps once on first view so it's obvious it moves.
 */
export function BeforeAfter({ study, sample = false }: { study: CaseStudy; sample?: boolean }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(50)
  const posRef = useRef(50)
  posRef.current = pos
  const [dragging, setDragging] = useState(false)
  const reduce = useReducedMotionSafe()
  const inView = useInView(frameRef, { once: true, amount: 0.6 })
  const motionRef = useRef<AnimationPlaybackControls | null>(null)
  const touchedRef = useRef(false)
  const gestureRef = useRef<{ x: number; y: number; type: string; moved: boolean } | null>(null)

  const glideTo = useCallback(
    (to: number | number[], duration = 0.6) => {
      motionRef.current?.stop()
      if (reduce) {
        setPos(Array.isArray(to) ? to[to.length - 1] : to)
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

  useEffect(() => {
    if (!inView || touchedRef.current || reduce) return
    const id = window.setTimeout(() => !touchedRef.current && glideTo([25, 75, 50], 2.4), 400)
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
    if (g?.type === 'touch' && !dragging && !g.moved) {
      const r = e.currentTarget.getBoundingClientRect()
      glideTo(((e.clientX - r.left) / r.width) * 100, 0.4)
    }
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
    <article>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="flex items-baseline gap-3">
          <h3 className="text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">{study.client}</h3>
          {sample && <span className="rounded-full border border-amber-300/40 px-2.5 py-0.5 text-[11px] text-amber-200">sample</span>}
        </div>
        <p className="!mt-0 text-sm text-white/55">
          {study.industry}
          {study.location ? ` · ${study.location}` : ''}
        </p>
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
        className={`relative aspect-[4/5] w-full touch-pan-y select-none overflow-hidden rounded-[28px] border border-white/[0.08] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] sm:aspect-[16/9] ${
          dragging ? 'cursor-grabbing' : 'cursor-ew-resize'
        }`}
      >
        {study.after.image ? (
          <Screenshot src={study.after.image} mobileSrc={study.after.mobileImage} alt={`${study.client} — ${study.after.caption}`} />
        ) : (
          <ModernMock name={study.client} />
        )}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          {study.before.image ? (
            <Screenshot src={study.before.image} mobileSrc={study.before.mobileImage} alt={`${study.client} — ${study.before.caption}`} />
          ) : (
            <DatedMock name={study.client} />
          )}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-[#4080E0] shadow-[0_0_16px_rgba(64,128,224,0.9)]"
          style={{ left: `${pos}%` }}
        />
        <div
          role="slider"
          tabIndex={0}
          aria-label={`Compare ${study.client} before and after`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          onKeyDown={onKeyDown}
          className={`absolute top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#04101e] shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_12px_40px_-12px_rgba(64,128,224,0.9)] transition-transform duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4080E0] ${
            dragging ? 'scale-110' : 'hover:scale-110'
          }`}
          style={{ left: `${pos}%` }}
        >
          <span aria-hidden className="text-sm font-semibold">
            ‹ ›
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13px]">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              takeControl()
              glideTo(100)
            }}
            aria-pressed={pos > 95}
            className={`rounded-full border px-4 py-2 transition-colors ${pos > 95 ? 'border-white/40 bg-white/10 text-white' : 'border-white/10 text-white/60 hover:text-white'}`}
          >
            ← Before
          </button>
          <button
            type="button"
            onClick={() => {
              takeControl()
              glideTo(0)
            }}
            aria-pressed={pos < 5}
            className={`rounded-full border px-4 py-2 transition-colors ${pos < 5 ? 'border-white/40 bg-white/10 text-white' : 'border-white/10 text-white/80 hover:text-white'}`}
          >
            After →
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {study.results.map((r) => (
            <span key={r.label} className="text-white/70">
              <span className="font-semibold text-white">{r.value}</span> {r.label}
            </span>
          ))}
          {study.url && (
            <a
              href={study.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-semibold text-[#04101e] transition-colors hover:bg-[#e6eefc]"
            >
              See it live <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
