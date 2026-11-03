'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Section links that light up for the section being read, plus a thin reading-progress bar under the header. */
export function OfferNav({ items, label }: { items: [href: string, text: string][]; label: string }): React.ReactElement {
  const [active, setActive] = useState(items[0]?.[0] ?? '')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const targets = items.map(([href]) => document.querySelector<HTMLElement>(href)).filter((x): x is HTMLElement => !!x)
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible?.target.id) setActive(`#${visible.target.id}`)
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    targets.forEach((t) => io.observe(t))
    const onScroll = (): void => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [items])

  return (
    <>
      <nav className="ms-auto hidden items-center gap-0.5 rounded-full bg-slate-900/[0.04] p-1 lg:flex" aria-label={label}>
        {items.map(([href, text]) => (
          <a
            key={href}
            href={href}
            aria-current={active === href ? 'location' : undefined}
            className={cn('rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all', active === href ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-900')}
          >
            {text}
          </a>
        ))}
      </nav>
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-transparent">
        <span className="block h-px origin-[0%_50%] bg-[var(--offer-accent)] transition-transform duration-150 rtl:origin-[100%_50%]" style={{ transform: `scaleX(${progress})` }} />
      </span>
    </>
  )
}

/** Fades content up when it scrolls into view (skipped for people who prefer reduced motion). */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  // Visible by default (server render, link previews, print); only content still below the fold gets animated in
  const [shown, setShown] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return
    setShown(false)
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={cn('transition-all duration-700 ease-out motion-reduce:transition-none', shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0', className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}
