'use client'

/* eslint-disable @next/next/no-img-element */
import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useMotionValueEvent, useTransform } from 'framer-motion'
import { ArrowRight, ArrowUpRight, X } from 'lucide-react'
import { workProjects, WorkProject } from '@/lib/workShowcase'
import { PinnedStage } from './PinnedStage'
import { useReducedMotionSafe } from './useReducedMotionSafe'

/** Per-funnel styling for the gallery. Class strings only, so each funnel keeps its own look. */
export type WorkTheme = {
  /** Outer edge of the browser and phone frames */
  frame: string
  /** Browser chrome bar */
  chrome: string
  /** Address-bar text */
  chromeText: string
  title: string
  meta: string
  body: string
  /** Primary button ("I want one like this") */
  button: string
  /** Secondary link ("Take a look", "Visit the live site") */
  link: string
  /** Counter and dots */
  counter: string
  dot: string
  dotActive: string
  /** Lightbox backdrop and panel */
  overlay: string
  panel: string
  /** Name font, e.g. a display serif */
  nameFont?: string
  /** "Concept" pill next to a concept project's name */
  badge?: string
  /** Show the kind of site instead of client names, and no "Concept" pill */
  hideNames?: boolean
}

// Frame proportions: the browser screen is 16:10, the phone screen 390×844
const BROWSER_RATIO = 10 / 16
const PHONE_RATIO = 844 / 390

/**
 * A screenshot that slowly scrolls itself top-to-bottom and back while `active`,
 * so a full-page capture reads as a live site. With a `video` (a recording of
 * scrolling the real page) it plays that instead, while active.
 */
function LiveScreen({ shot, width, frameRatio, active, load }: { shot: WorkProject['desktop']; width: number; frameRatio: number; active: boolean; load: boolean }) {
  const reduce = useReducedMotionSafe()
  const videoRef = useRef<HTMLVideoElement>(null)
  const useVideo = Boolean(shot.video) && !reduce

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (active && load) v.play().catch(() => {})
    else v.pause()
  }, [active, load])

  if (useVideo) {
    return (
      <video
        ref={videoRef}
        aria-hidden
        src={load ? shot.video : undefined}
        poster={load ? shot.src : undefined}
        muted
        loop
        playsInline
        preload="none"
        className="absolute inset-0 h-full w-full bg-black/20 object-cover object-top"
      />
    )
  }

  const overflow = shot.height / width / frameRatio
  const scrolls = overflow > 1.15 && !reduce
  const style: CSSProperties = {
    backgroundImage: load ? `url(${shot.src})` : undefined,
    backgroundSize: '100% auto',
    backgroundPosition: '50% 0%',
    backgroundRepeat: 'no-repeat',
    ...(scrolls && {
      animation: `work-scroll ${Math.round(5 * overflow)}s ease-in-out infinite`,
      animationPlayState: active ? 'running' : 'paused',
    }),
  }
  return <div aria-hidden className="absolute inset-0 bg-black/20" style={style} />
}

function BrowserFrame({ project, theme, active, load }: { project: WorkProject; theme: WorkTheme; active: boolean; load: boolean }) {
  return (
    <div className={`overflow-hidden rounded-[18px] border shadow-[0_40px_100px_-30px_rgba(0,0,0,0.85)] ${theme.frame}`}>
      <div className={`flex items-center gap-3 px-3.5 py-2.5 ${theme.chrome}`}>
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className={`mx-auto max-w-[60%] truncate rounded-full bg-white/[0.06] px-3 py-0.5 text-[11px] ${theme.chromeText}`}>{project.domain}</span>
        <span className="w-[42px]" aria-hidden />
      </div>
      <div className="relative" style={{ aspectRatio: '16 / 10' }}>
        <LiveScreen shot={project.desktop} width={1200} frameRatio={BROWSER_RATIO} active={active} load={load} />
      </div>
    </div>
  )
}

function PhoneFrame({ project, theme, active, load, className = '' }: { project: WorkProject; theme: WorkTheme; active: boolean; load: boolean; className?: string }) {
  return (
    <div className={`rounded-[14%/6.5%] border bg-[#05070c] p-[1.2%] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)] ${theme.frame} ${className}`}>
      <div className="relative overflow-hidden rounded-[12.5%/5.8%]" style={{ aspectRatio: '390 / 844' }}>
        <LiveScreen shot={project.mobile} width={600} frameRatio={PHONE_RATIO} active={active} load={load} />
        <span aria-hidden className="absolute left-1/2 top-[1.6%] h-[3.2%] w-[30%] -translate-x-1/2 rounded-full bg-black" />
      </div>
    </div>
  )
}

/** The two frames together: the site on a "laptop" with its phone version tilted in front. */
function Showpiece({ project, theme, active, load, onOpen }: { project: WorkProject; theme: WorkTheme; active: boolean; load: boolean; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} aria-label={`Take a look at ${project.client}`} className="group relative block w-full text-left">
      <div className="transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1">
        <BrowserFrame project={project} theme={theme} active={active} load={load} />
      </div>
      <PhoneFrame
        project={project}
        theme={theme}
        active={active}
        load={load}
        className="absolute -bottom-[9%] -right-[2%] w-[30%] rotate-[5deg] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-[2deg] sm:w-[22%] lg:-right-[4%] lg:w-[19%]"
      />
    </button>
  )
}

function Caption({ project, theme, onOpen, index, total }: { project: WorkProject; theme: WorkTheme; onOpen: () => void; index: number; total: number }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
      <div className="max-w-xl">
        <div className={`text-[13px] ${theme.meta}`}>
          <span className={theme.counter}>{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
          <span className="mx-2">·</span>
          {theme.hideNames ? project.location : project.kind}
          {!theme.hideNames && project.location ? ` · ${project.location}` : ''}
        </div>
        <h3 className={`mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-none pb-0 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl ${theme.title} ${theme.nameFont ?? ''}`}>
          {theme.hideNames ? project.kind : project.client}
          {project.concept && (
            <span className={`rounded-full border px-2.5 py-0.5 font-sans text-[11px] font-medium uppercase tracking-[0.15em] ${theme.badge}`}>Concept</span>
          )}
        </h3>
        <p className={`!mt-1.5 text-[15px] leading-relaxed ${theme.body}`}>{project.line}</p>
      </div>
      <button type="button" onClick={onOpen} className={`inline-flex shrink-0 items-center gap-1.5 self-start text-sm font-semibold sm:self-auto ${theme.link}`}>
        Take a look
        <ArrowUpRight className="h-4 w-4" />
      </button>
    </div>
  )
}

/** Full-screen look at one site, without leaving the funnel. Ends on the call to action. */
function Lightbox({ project, theme, onClose, onWant }: { project: WorkProject; theme: WorkTheme; onClose: () => void; onWant: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={project.client}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[80] flex flex-col backdrop-blur-md ${theme.overlay}`}
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0">
          <div className={`truncate text-lg font-semibold ${theme.title} ${theme.nameFont ?? ''}`}>{theme.hideNames ? project.kind : project.client}</div>
          <div className={`truncate text-[13px] ${theme.meta}`}>
            {theme.hideNames ? project.location : project.kind}
            {!theme.hideNames && project.location ? ` · ${project.location}` : ''}
          </div>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${theme.frame} ${theme.title}`}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <motion.div
        initial={{ y: 24 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`mx-auto overflow-hidden rounded-2xl border ${theme.frame} max-w-[420px] md:max-w-5xl`}>
          {project.mobile.video ? (
            <video src={project.mobile.video} poster={project.mobile.src} autoPlay muted loop playsInline aria-label={`${project.client} on a phone`} className="block w-full md:hidden" />
          ) : (
            <img src={project.mobile.src} alt={`${project.client} on a phone`} className="block w-full md:hidden" />
          )}
          {project.desktop.video ? (
            <video src={project.desktop.video} poster={project.desktop.src} autoPlay muted loop playsInline aria-label={`${project.client} on a computer`} className="hidden w-full md:block" />
          ) : (
            <img src={project.desktop.src} alt={`${project.client} on a computer`} className="hidden w-full md:block" />
          )}
        </div>
      </motion.div>

      <div className={`border-t px-4 py-3 sm:px-6 ${theme.panel}`} onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          {project.url ? (
            <a href={project.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 text-sm ${theme.link}`}>
              Visit the live site
              <ArrowUpRight className="h-4 w-4" />
            </a>
          ) : theme.hideNames ? (
            <span />
          ) : (
            <span className={`text-sm ${theme.meta}`}>A concept design by IGANI</span>
          )}
          <button type="button" onClick={onWant} className={`inline-flex flex-1 items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold sm:flex-none ${theme.button}`}>
            I want one like this
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>,
    document.body
  )
}

/** Soft glow behind the gallery that takes on the current project's colour. */
function Glow({ color }: { color: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-35 blur-[120px] transition-[background-color] duration-700"
      style={{ backgroundColor: color }}
    />
  )
}

/** Desktop: the stage holds while scrolling moves the row of sites sideways, one per step. */
function PinnedRow({ projects, theme, onOpen }: { projects: WorkProject[]; theme: WorkTheme; onOpen: (p: WorkProject) => void }) {
  const n = projects.length
  const [active, setActive] = useState(0)
  const firstRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ step: 0, offset: 0 })

  useEffect(() => {
    const el = firstRef.current
    const track = el?.parentElement
    const box = track?.parentElement
    if (!el || !track || !box) return
    // Step = one slide plus the gap after it (the gap differs on phones); offset centres a slide in the row
    const measure = () => {
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0
      setSize({ step: el.offsetWidth + gap, offset: (box.clientWidth - el.offsetWidth) / 2 })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    return () => ro.disconnect()
  }, [])

  return (
    // Extra room at the bottom on phones for the sticky button bar
    <PinnedStage screens={n - 1} className="overflow-clip pb-24 pt-28 lg:pb-6">
      {(progress) => <PinnedTrack projects={projects} progress={progress} size={size} active={active} setActive={setActive} firstRef={firstRef} theme={theme} onOpen={onOpen} />}
    </PinnedStage>
  )
}

function PinnedTrack({
  projects,
  progress,
  size,
  active,
  setActive,
  firstRef,
  theme,
  onOpen,
}: {
  projects: WorkProject[]
  progress: import('framer-motion').MotionValue<number>
  size: { step: number; offset: number }
  active: number
  setActive: (i: number) => void
  firstRef: React.RefObject<HTMLDivElement>
  theme: WorkTheme
  onOpen: (p: WorkProject) => void
}) {
  const n = projects.length
  // Small dead zones at both ends so the first and last sites get a beat on their own
  const x = useTransform(progress, [0.06, 0.94], [size.offset, size.offset - (n - 1) * size.step], { clamp: true })
  useMotionValueEvent(progress, 'change', (v) => {
    const i = Math.round(Math.min(1, Math.max(0, (v - 0.06) / 0.88)) * (n - 1))
    if (i !== active) setActive(i)
  })
  const project = projects[active]

  return (
    <div className="relative w-full">
      <Glow color={project.accent} />
      <motion.div style={{ x }} className="relative flex gap-5 lg:gap-16">
        {projects.map((p, i) => (
          <div
            key={p.id}
            ref={i === 0 ? firstRef : undefined}
            className="w-[86%] shrink-0 transition-[opacity,transform] duration-500 lg:w-[min(66%,calc((100svh-380px)*1.5))]"
            style={{ opacity: i === active ? 1 : 0.35, transform: `scale(${i === active ? 1 : 0.94})` }}
          >
            <Showpiece project={p} theme={theme} active={i === active} load={Math.abs(i - active) <= 1} onOpen={() => onOpen(p)} />
          </div>
        ))}
      </motion.div>
      <div className="relative mx-auto mt-10 w-[86%] lg:mt-14 lg:w-[min(66%,calc((100svh-380px)*1.5))]">
        <AnimatePresence mode="wait">
          <motion.div key={project.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
            <Caption project={project} theme={theme} index={active} total={n} onOpen={() => onOpen(project)} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/** Phones (and reduced motion): swipeable cards, one site per screen. */
function SwipeRow({ projects, theme, onOpen }: { projects: WorkProject[]; theme: WorkTheme; onOpen: (p: WorkProject) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { rootMargin: '300px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const onScroll = useCallback(() => {
    const el = ref.current
    if (!el) return
    const card = el.firstElementChild as HTMLElement | null
    if (!card) return
    setActive(Math.round(el.scrollLeft / (card.offsetWidth + 16)))
  }, [])

  return (
    <div className="relative">
      <Glow color={projects[active]?.accent ?? projects[0].accent} />
      <div
        ref={ref}
        onScroll={onScroll}
        className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {projects.map((p, i) => (
          <div key={p.id} className="w-[86%] shrink-0 snap-center sm:w-[70%]">
            <div className="pb-[12%]">
              <Showpiece project={p} theme={theme} active={seen && i === active} load={seen && Math.abs(i - active) <= 1} onOpen={() => onOpen(p)} />
            </div>
            <div className="mt-2">
              <Caption project={p} theme={theme} index={i} total={projects.length} onOpen={() => onOpen(p)} />
            </div>
          </div>
        ))}
        <div aria-hidden className="w-px shrink-0" />
      </div>
      <div className="mt-4 flex justify-center gap-2" aria-hidden>
        {projects.map((p, i) => (
          <span key={p.id} className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? `w-6 ${theme.dotActive}` : `w-1.5 ${theme.dot}`}`} />
        ))}
      </div>
    </div>
  )
}

/**
 * Gallery: every project as a live-looking site on a laptop with its phone version
 * in front. Scrolling down pins the section and swipes sideways to the next site, on
 * phones as well as desktop (swipe cards only when the visitor prefers reduced
 * motion), and a full-screen look ends on the call to action.
 */
export function WorkGallery({ theme, onWant, projects = workProjects }: { theme: WorkTheme; onWant: () => void; projects?: WorkProject[] }) {
  const reduce = useReducedMotionSafe()
  const [open, setOpen] = useState<WorkProject | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <>
      {reduce ? <SwipeRow projects={projects} theme={theme} onOpen={setOpen} /> : <PinnedRow projects={projects} theme={theme} onOpen={setOpen} />}
      {mounted && (
        <AnimatePresence>
          {open && (
            <Lightbox
              key={open.id}
              project={open}
              theme={theme}
              onClose={() => setOpen(null)}
              onWant={() => {
                setOpen(null)
                onWant()
              }}
            />
          )}
        </AnimatePresence>
      )}
    </>
  )
}

/** Small strip of projects, e.g. beside a form ("you'd be in good company") or as "also trusted by". */
export function WorkStrip({
  className = '',
  labelClass = '',
  frameClass = '',
  label = 'You’d be in good company',
  projects = workProjects,
  listClass = 'justify-center lg:justify-start',
}: {
  className?: string
  labelClass?: string
  frameClass?: string
  label?: string
  projects?: WorkProject[]
  listClass?: string
}) {
  return (
    <div className={className}>
      <div className={`text-[13px] ${labelClass}`}>{label}</div>
      <ul className={`mt-3 flex flex-wrap gap-1.5 sm:gap-2 ${listClass}`}>
        {projects.map((p) => (
          <li key={p.id} title={p.client} className={`w-[60px] overflow-hidden rounded-lg border sm:w-[84px] ${frameClass}`}>
            <img src={p.thumb} alt={p.client} loading="lazy" className="block aspect-[16/10] w-full object-cover object-top" />
          </li>
        ))}
      </ul>
    </div>
  )
}
