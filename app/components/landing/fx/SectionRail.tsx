'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export type RailItem = { id: string; index: string; label: string }

type SectionRailProps = {
  items: RailItem[]
}

/**
 * Fixed left-hand rail on large screens: serif numerals that track the active
 * section and jump on click. Appears once the hero is scrolled past.
 */
export function SectionRail({ items }: SectionRailProps) {
  const [active, setActive] = useState<string | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const probe = window.scrollY + window.innerHeight * 0.4
      let current: string | null = null
      for (const it of items) {
        const el = document.getElementById(it.id)
        if (!el) continue
        if (el.offsetTop <= probe) current = it.id
      }
      setActive(current)
      setShown(window.scrollY > window.innerHeight * 0.7)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [items])

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const activeIndex = Math.max(0, items.findIndex((it) => it.id === active))

  return (
    <motion.nav
      aria-label="Sections"
      initial={false}
      animate={{ opacity: shown ? 1 : 0, x: shown ? 0 : -12 }}
      transition={{ duration: 0.4 }}
      // Only where the content column leaves real margin (≥1400px), so nothing overlaps the page.
      className={`fixed left-6 top-1/2 z-40 hidden -translate-y-1/2 min-[1400px]:block ${shown ? '' : 'pointer-events-none'}`}
    >
      <div className="relative flex flex-col items-center gap-0.5 rounded-full border border-white/10 bg-[#061225]/70 px-1.5 py-2 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        {/* Sliding indicator behind the active numeral */}
        <motion.span
          aria-hidden
          className="absolute left-1.5 right-1.5 h-9 rounded-full bg-white/[0.09]"
          animate={{ top: 8 + activeIndex * 38 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
        {items.map((it) => {
          const on = active === it.id
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => jump(it.id)}
              aria-current={on ? 'true' : undefined}
              aria-label={`${it.index} ${it.label}`}
              className="group relative flex h-9 w-9 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <span
                className={`font-display relative z-10 text-[15px] leading-none transition-colors duration-300 ${
                  on ? 'text-white' : 'text-white/40 group-hover:text-white/80'
                }`}
              >
                {it.index}
              </span>
              {/* Hover-only tooltip; sits in the margin, never over content */}
              <span
                role="presentation"
                className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-full border border-white/10 bg-[#061225]/90 px-3 py-1.5 text-xs text-white/85 opacity-0 shadow-lg backdrop-blur-xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
              >
                {it.label}
              </span>
            </button>
          )
        })}
      </div>
    </motion.nav>
  )
}
