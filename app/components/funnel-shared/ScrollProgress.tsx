'use client'

import { useEffect, useRef, useState } from 'react'

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
  const [active, setActive] = useState(-1)
  const [shown, setShown] = useState(false)
  const fills = useRef<(HTMLSpanElement | null)[]>([])
  const last = useRef<number[]>([])

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const vh = window.innerHeight
      // All layout reads together, then the writes: the bar fills are set directly, so scrolling never re-renders React
      const rects = items.map(({ id }) => document.getElementById(id)?.getBoundingClientRect() ?? null)
      let firstOpen = -1
      rects.forEach((r, i) => {
        // 0 when the section's top reaches mid-screen, 1 when its bottom does
        const v = r ? Math.round(Math.min(1, Math.max(0, (vh * 0.5 - r.top) / Math.max(r.height, 1))) * 200) / 200 : 0
        if (v < 1 && firstOpen === -1) firstOpen = i
        if (last.current[i] !== v) {
          last.current[i] = v
          const el = fills.current[i]
          if (el) el.style.width = `${v * 100}%`
        }
      })
      setActive(firstOpen)
      const first = rects[0]
      setShown(!!first && first.top < vh * 0.6)
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
                <span ref={(el) => void (fills.current[i] = el)} className={`block h-full rounded-full ${fillClass}`} style={{ width: 0 }} />
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
