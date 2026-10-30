'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import { Check, Rotate3d } from 'lucide-react'
import { SectionHeading } from '@/app/components/landing/fx/SectionHeading'
import { useReducedMotionSafe } from '@/app/components/funnel-shared/useReducedMotionSafe'

// Where the walkthrough is at each moment of the recording (seconds), for the room label and floor plan
const ROOMS = [
  { name: 'Kitchen', from: 0, plan: { x: 4, y: 4, w: 58, h: 42 } },
  { name: 'Dining', from: 1.2, plan: { x: 66, y: 4, w: 46, h: 42 } },
  { name: 'Living room', from: 3.5, plan: { x: 4, y: 50, w: 108, h: 56 } },
  { name: 'Terrace', from: 8.3, plan: { x: 116, y: 4, w: 40, h: 102 } },
]

const PERKS = ['Your Matterport tours, embedded on your own listing pages', 'Buyers walk every room, any time of night', 'Works on any phone, no app']

function roomAt(t: number) {
  let i = 0
  ROOMS.forEach((r, idx) => t >= r.from && (i = idx))
  return i
}

/** The floor plan in the corner, lighting up the room the tour is in. */
function FloorPlan({ active }: { active: number }) {
  const r = ROOMS[active].plan
  return (
    <svg viewBox="0 0 160 110" className="h-auto w-[64px] sm:w-[150px]" aria-hidden>
      {ROOMS.map((room, i) => (
        <rect
          key={room.name}
          {...{ x: room.plan.x, y: room.plan.y, width: room.plan.w, height: room.plan.h }}
          rx="4"
          className="transition-[fill,stroke] duration-500"
          fill={i === active ? 'rgba(64,128,224,0.35)' : 'rgba(255,255,255,0.06)'}
          stroke={i === active ? '#9ec0f5' : 'rgba(255,255,255,0.25)'}
          strokeWidth="1.5"
        />
      ))}
      <circle cx={r.x + r.w / 2} cy={r.y + r.h / 2} r="4" fill="#fff" className="transition-all duration-700" />
      <circle cx={r.x + r.w / 2} cy={r.y + r.h / 2} r="9" fill="none" stroke="#fff" strokeOpacity="0.5" className="animate-ping origin-center [transform-box:fill-box]" />
    </svg>
  )
}

/** 04 — 3D tours: a real walkthrough recording, tilting up into place as you scroll, with a live room label and floor plan. */
export function Tour3D() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const reduce = useReducedMotionSafe()
  const [load, setLoad] = useState(false)
  const [src, setSrc] = useState('/work/tour-3d.mp4')
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'center center'] })
  const rotateX = useTransform(scrollYProgress, [0, 1], [24, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [0.86, 1])
  const y = useTransform(scrollYProgress, [0, 1], [60, 0])

  // Load (and play) only once the section is near, and pick the lighter file on phones
  useEffect(() => {
    if (window.matchMedia('(max-width: 639px)').matches) setSrc('/work/tour-3d-mobile.mp4')
    const el = sectionRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setLoad(true)
        const v = videoRef.current
        if (!v || reduce) return
        if (e.isIntersecting) v.play().catch(() => {})
        else v.pause()
      },
      { rootMargin: '200px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reduce])

  const onTime = () => {
    const v = videoRef.current
    if (!v || !v.duration) return
    setActive(roomAt(v.currentTime))
    setProgress(v.currentTime / v.duration)
  }

  return (
    <section id="tour" className="relative scroll-mt-20 overflow-hidden py-20 sm:py-28">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-[#4080E0]/20 blur-[140px]" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          index="04"
          label="3D tours"
          aside="Matterport, built into your site"
          title="Let buyers *walk in* before they drive over."
          sub="We integrate Matterport 3D tours right into your listing pages, so buyers walk through on your site, not someone else’s. Serious buyers tour at midnight and show up ready to make an offer, and sellers see marketing other agents don’t offer."
          className="mb-12"
        />

        <div ref={sectionRef} style={{ perspective: 1400 }}>
          <motion.div
            style={reduce ? undefined : { rotateX, scale, y, transformOrigin: '50% 100%' }}
            className="relative overflow-hidden rounded-[28px] border border-white/[0.12] bg-[#061225] shadow-[0_60px_140px_-40px_rgba(0,0,0,0.95),0_0_0_1px_rgba(64,128,224,0.15)]"
          >
            <div className="relative aspect-[16/10] sm:aspect-[1280/610]">
              <video
                ref={videoRef}
                src={load ? src : undefined}
                poster="/work/tour-3d-poster.jpg"
                autoPlay={!reduce}
                muted
                loop
                playsInline
                preload="none"
                controls={reduce}
                onTimeUpdate={onTime}
                aria-label="A Matterport 3D walkthrough of a home: kitchen, dining, living room and terrace"
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* HUD */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />
              <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 sm:left-5 sm:top-5">
                <span className="flex items-center gap-2 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase sm:px-3 sm:py-1.5 sm:text-[11px] tracking-[0.15em] text-white backdrop-blur-md">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#9ec0f5] opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#9ec0f5]" />
                  </span>
                  3D tour
                </span>
                <span className="relative h-6 overflow-hidden rounded-full bg-white px-2.5 text-[12px] font-semibold leading-6 sm:h-[30px] sm:px-3 sm:text-[13px] sm:leading-[30px] text-[#04101e]">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span key={ROOMS[active].name} initial={{ y: 30 }} animate={{ y: 0 }} exit={{ y: -30 }} transition={{ duration: 0.35 }} className="block">
                      {ROOMS[active].name}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </div>
              <div className="pointer-events-none absolute right-3 top-3 hidden items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-[12px] text-white/85 backdrop-blur-md sm:right-5 sm:top-5 sm:flex">
                <Rotate3d className="h-4 w-4" />
                Self-guided, room by room
              </div>
              <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl bg-black/55 p-1.5 backdrop-blur-md sm:bottom-5 sm:left-5 sm:rounded-2xl sm:p-3">
                <FloorPlan active={active} />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-white/10">
                <div className="h-full bg-[#9ec0f5]" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          </motion.div>
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-3">
          {PERKS.map((p) => (
            <li key={p} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 text-[15px] text-white/80">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4080E0]/20 text-[#9ec0f5]">
                <Check className="h-4 w-4" />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
