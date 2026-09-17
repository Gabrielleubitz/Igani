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

  return (
    <motion.nav
      aria-label="Sections"
      initial={false}
      animate={{ opacity: shown ? 1 : 0, x: shown ? 0 : -8 }}
      transition={{ duration: 0.4 }}
      className={`fixed left-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-1 xl:flex ${shown ? '' : 'pointer-events-none'}`}
    >
      {items.map((it) => {
        const on = active === it.id
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => jump(it.id)}
            aria-current={on ? 'true' : undefined}
            className="group flex items-center gap-3 py-1.5 text-left focus-visible:outline-none"
          >
            <span
              className={`font-display text-lg leading-none transition-colors duration-300 ${
                on ? 'text-white' : 'text-white/30 group-hover:text-white/70'
              }`}
            >
              {it.index}
            </span>
            <span
              className={`h-px transition-all duration-300 ${on ? 'w-6 bg-white/70' : 'w-3 bg-white/20 group-hover:w-5 group-hover:bg-white/40'}`}
            />
            <span
              className={`whitespace-nowrap text-xs transition-all duration-300 ${
                on ? 'translate-x-0 text-white/80 opacity-100' : '-translate-x-1 text-white/60 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
              }`}
            >
              {it.label}
            </span>
          </button>
        )
      })}
    </motion.nav>
  )
}
