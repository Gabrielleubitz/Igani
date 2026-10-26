'use client'

import { useEffect, useState } from 'react'

type ScrollProgressProps = {
  /** Section element ids in page order, with the label shown under each segment. */
  items: { id: string; label: string }[]
  /** Fixed position classes, e.g. "top-0" or "top-[76px]". */
  positionClass?: string
  /** Surface behind the bar so labels stay legible over any section. */
  barClass: string
  trackClass: string
  fillClass: string
  labelClass: string
  activeLabelClass: string
}

/**
 * Segmented reading-progress bar: one segment per section, filling as you
 * read it, so visitors always know where they are and how much is left.
 * Appears once the first section reaches the screen.
 */
export function ScrollProgress({
  items,
  positionClass = 'top-0',
  barClass,
  trackClass,
  fillClass,
  labelClass,
  activeLabelClass,
}: ScrollProgressProps) {
  const [progress, setProgress] = useState<number[]>(() => items.map(() => 0))
  const [shown, setShown] = useState(false)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const vh = window.innerHeight
      const next = items.map(({ id }) => {
        const el = document.getElementById(id)
        if (!el) return 0
        const r = el.getBoundingClientRect()
        // 0 when the section's top reaches mid-screen, 1 when its bottom does
        return Math.min(1, Math.max(0, (vh * 0.5 - r.top) / Math.max(r.height, 1)))
      })
      setProgress(next)
      const first = document.getElementById(items[0].id)
      setShown(!!first && first.getBoundingClientRect().top < vh * 0.6)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [items])

  const active = progress.findIndex((p) => p < 1)

  return (
    <nav
      aria-label="Page progress"
      className={`fixed inset-x-0 z-[45] px-4 transition-all duration-500 sm:px-6 ${positionClass} ${
        shown ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-3 opacity-0'
      }`}
    >
      <ol className={`mx-auto flex max-w-6xl gap-1.5 rounded-full px-4 py-2 backdrop-blur-xl sm:px-6 sm:pb-1.5 ${barClass}`}>
        {items.map((item, i) => (
          <li key={item.id} className="flex-1">
            <button
              type="button"
              onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })}
              className="block w-full text-left"
              aria-current={i === active ? 'step' : undefined}
            >
              <span className={`block h-[3px] overflow-hidden rounded-full ${trackClass}`}>
                <span
                  className={`block h-full rounded-full transition-[width] duration-150 ${fillClass}`}
                  style={{ width: `${progress[i] * 100}%` }}
                />
              </span>
              <span className={`mt-1.5 hidden truncate text-[11px] transition-colors sm:block ${i === active ? activeLabelClass : labelClass}`}>
                {String(i + 1).padStart(2, '0')} · {item.label}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}
