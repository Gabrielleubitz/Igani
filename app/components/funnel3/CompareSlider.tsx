'use client'

import { useEffect, useState } from 'react'
import { SectionHeading } from '@/app/components/landing/fx/SectionHeading'
import { ArrowRight, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCaseStudy } from '@/app/components/funnel-shared/useCaseStudy'
import { Screenshot } from '@/app/components/funnel-shared/Screenshot'
import { ModernBackend } from './ModernBackend'

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
  aside: 'old vs new',
  title: 'Design is *trust*.',
  sub: 'Before they read your copy, they’ve already decided if you’re expensive or cheap.',
}

type Side = 'old' | 'new'

/** A larger look at one side, so small text is readable. Escape or a click outside closes it. */
function Lightbox({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-[90] flex items-center justify-center bg-[#02060f]/90 p-3 backdrop-blur-sm sm:p-8" onClick={onClose}>
      <div className="w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between text-sm text-white/80">
          <span>{label}</span>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-white/10">{children}</div>
      </div>
    </div>
  )
}

/**
 * Before and after, side by side. On a wide screen both designs are always fully visible; on a phone one shows at a time
 * with a big Old / New switch that cross-fades. Tapping a design opens a larger view.
 * `heading` and `caption` let other funnels tell it their way.
 */
export function CompareSlider({ heading = DEFAULT_HEADING, caption }: { heading?: Heading; caption?: string } = {}) {
  const cs = useCaseStudy()
  const [tab, setTab] = useState<'front' | 'back'>('front')
  const [mobileSide, setMobileSide] = useState<Side>('old')
  const [open, setOpen] = useState<Side | null>(null)
  const [wide, setWide] = useState(false)
  const backend = cs?.backend
  const showBack = tab === 'back' && Boolean(backend)
  // The client stays anonymous when the case study says so: no name in captions or alt text
  const who = cs ? (cs.anonymous ? cs.industry : cs.client) : ''

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setWide(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const switchTab = (t: 'front' | 'back') => {
    if (t === tab) return
    setMobileSide('old')
    setTab(t)
  }

  const captions: Record<Side, string> = cs
    ? { old: showBack && backend ? backend.before.caption : cs.before.caption, new: showBack && backend ? backend.after.caption : cs.after.caption }
    : { old: 'Outdated. Boring. Ignored.', new: 'Modern. Trusted. Converts.' }

  const nodes: Record<Side, React.ReactNode> = {
    old:
      showBack && backend ? (
        <Screenshot src={backend.before.image} alt={backend.before.caption} />
      ) : cs?.before.image ? (
        <Screenshot src={cs.before.image} mobileSrc={cs.before.mobileImage} alt={`${who} — ${cs.before.caption}`} />
      ) : (
        <DatedSite name={cs?.client} />
      ),
    new: showBack ? (
      <ModernBackend />
    ) : cs?.after.image ? (
      <Screenshot src={cs.after.image} mobileSrc={cs.after.mobileImage} video={cs.after.video} alt={`${who} — ${cs.after.caption}`} />
    ) : (
      <ModernSite name={cs?.client} />
    ),
  }

  const frame = (side: Side) => {
    const active = wide || mobileSide === side
    return (
      <div
        key={side}
        aria-hidden={!active}
        className={`col-start-1 row-start-1 transition-opacity duration-300 ${side === 'new' ? 'lg:col-start-3' : ''} ${
          active ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className={`mb-3 flex items-baseline gap-2 text-[13px] ${side === 'new' ? 'text-white' : 'text-white/60'}`}>
          <span className="font-display text-lg leading-none">{side === 'new' ? 'After' : 'Before'}</span>
          <span className={side === 'new' ? 'text-white/70' : 'text-white/45'}>· {captions[side]}</span>
        </div>
        <button
          type="button"
          tabIndex={active ? 0 : -1}
          onClick={() => setOpen(side)}
          aria-label={`Open a larger view: ${side === 'new' ? 'after' : 'before'}, ${captions[side]}`}
          className={`relative block aspect-[16/9] w-full cursor-zoom-in overflow-hidden rounded-2xl border text-left ${
            side === 'new' ? 'border-[#4080E0]/50 shadow-[0_0_0_1px_rgba(64,128,224,0.25),0_30px_90px_-30px_rgba(64,128,224,0.55)]' : 'border-white/[0.1] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]'
          }`}
        >
          {nodes[side]}
          <span className="pointer-events-none absolute inset-0 z-10" />
        </button>
      </div>
    )
  }

  return (
    <section id="reason" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading {...heading} className="mb-12" />

        {backend && (
          <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div role="tablist" aria-label="What to compare" className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
              {([['front', 'Front-end'], ['back', 'Back-end']] as const).map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  type="button"
                  id={`compare-tab-${key}`}
                  aria-selected={tab === key}
                  aria-controls="compare-panel"
                  onClick={() => switchTab(key)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                      e.preventDefault()
                      const other = key === 'front' ? 'back' : 'front'
                      switchTab(other)
                      document.getElementById(`compare-tab-${other}`)?.focus()
                    }
                  }}
                  tabIndex={tab === key ? 0 : -1}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${tab === key ? 'bg-white text-[#04101e]' : 'text-white/65 hover:text-white'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[13px] text-white/55">The site your buyers see, and the dashboard you run it from.</p>
          </div>
        )}

        {/* Phones and tablets: flip between old and new */}
        <div role="group" aria-label="Show the old or the new design" className="mb-5 grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 lg:hidden">
          {(['old', 'new'] as const).map((side) => (
            <button
              key={side}
              type="button"
              aria-pressed={mobileSide === side}
              onClick={() => setMobileSide(side)}
              className={`rounded-full py-3 text-[15px] font-semibold transition-colors ${mobileSide === side ? (side === 'new' ? 'bg-[#2f6fd8] text-white' : 'bg-white text-[#04101e]') : 'text-white/65'}`}
            >
              {side === 'old' ? 'Old' : 'New'}
            </button>
          ))}
        </div>

        <div id="compare-panel" role={backend ? 'tabpanel' : undefined} aria-labelledby={backend ? `compare-tab-${tab}` : undefined} className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_auto_1fr] lg:gap-5">
          {frame('old')}
          <div aria-hidden className="hidden self-center lg:col-start-2 lg:row-start-1 lg:flex">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white/80">
              <ArrowRight className="h-5 w-5" />
            </span>
          </div>
          {frame('new')}
        </div>
        <p className="mt-3 text-center text-[12px] text-white/40 lg:text-left">Tap a design to enlarge it.</p>

        {cs && !showBack && (
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
              <div className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-white">{who}</div>
              {!cs.anonymous && (
                <div className="text-sm text-white/55">
                  {cs.industry}
                  {cs.location ? ` · ${cs.location}` : ''}
                </div>
              )}
              {caption && <p className="!mt-3 max-w-md text-[15px] leading-relaxed text-white/80">{caption}</p>}
              {!cs.anonymous && cs.quote && (
                <blockquote className="mt-3 max-w-md font-display text-lg leading-snug text-[#dbe6ff]">
                  &ldquo;{cs.quote.text}&rdquo;
                  <span className="mt-1 block font-sans text-xs text-white/50">
                    — {cs.quote.author}
                    {cs.quote.role ? `, ${cs.quote.role}` : ''}
                  </span>
                </blockquote>
              )}
            </div>
            {cs.results.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                {cs.results.map((r) => (
                  <div key={r.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-2">
                    <div className="text-xl font-semibold text-white">{r.value}</div>
                    <div className="text-xs text-white/55">{r.label}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {open && (
        <Lightbox label={`${open === 'new' ? 'After' : 'Before'} · ${captions[open]}`} onClose={() => setOpen(null)}>
          {nodes[open]}
        </Lightbox>
      )}
    </section>
  )
}
