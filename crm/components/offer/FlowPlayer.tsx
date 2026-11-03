'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface FlowPlayerProps {
  steps: { title: string; caption: string }[]
  /** One rendered screen (already inside its device frame) per step */
  slides: ReactNode[]
  rtl: boolean
  labels: { step: string; of: string; next: string; prev: string }
  initialStep?: number
  /** Desktop screens are wide: put the step list above the device instead of beside it */
  stacked?: boolean
}

/**
 * Walks through a flow: a numbered step rail with progress on one side, the device on a soft accent stage on the other.
 * Arrow keys move between steps while the player is in view; screens cross-fade.
 */
export function FlowPlayer({ steps, slides, rtl, labels, initialStep = 0, stacked = false }: FlowPlayerProps): React.ReactElement {
  const last = Math.max(slides.length - 1, 0)
  const [i, setI] = useState(Math.min(Math.max(initialStep, 0), last))
  const root = useRef<HTMLDivElement>(null)
  const go = useCallback((n: number) => setI(Math.min(Math.max(n, 0), last)), [last])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const el = root.current
      if (!el || (e.target as HTMLElement)?.closest('input, textarea, select')) return
      const r = el.getBoundingClientRect()
      if (r.bottom < 0 || r.top > window.innerHeight) return // only the player on screen reacts
      const forward = rtl ? 'ArrowLeft' : 'ArrowRight'
      const back = rtl ? 'ArrowRight' : 'ArrowLeft'
      if (e.key === forward) go(i + 1)
      else if (e.key === back) go(i - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [i, go, rtl])

  const progress = slides.length > 1 ? (i / last) * 100 : 100
  const rail = (
    <ol className={cn('relative', stacked ? 'grid gap-2 sm:grid-cols-2 lg:grid-cols-4' : 'space-y-1')}>
      {!stacked ? (
        <span aria-hidden className="absolute bottom-6 start-[19px] top-6 w-px bg-slate-200">
          <span className="block w-px bg-[var(--offer-accent)] transition-all duration-500" style={{ height: `${progress}%` }} />
        </span>
      ) : null}
      {steps.map((s, n) => {
        const active = n === i
        const done = n < i
        return (
          <li key={n} className="relative">
            <button
              type="button"
              onClick={() => go(n)}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'group flex w-full items-start gap-3 rounded-2xl px-2 py-2.5 text-start transition-all duration-300',
                active ? 'bg-white shadow-[0_10px_30px_-15px_rgba(15,23,42,0.3)] ring-1 ring-slate-900/5' : 'hover:bg-white/60',
                stacked && 'h-full px-3',
              )}
            >
              <span
                className={cn(
                  'relative z-10 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums transition-colors',
                  active ? 'bg-[var(--offer-accent)] text-white shadow-[0_0_0_4px_color-mix(in_srgb,var(--offer-accent)_18%,transparent)]' : done ? 'bg-[color-mix(in_srgb,var(--offer-accent)_14%,white)] text-[var(--offer-accent)]' : 'bg-white text-slate-400 ring-1 ring-slate-200',
                )}
              >
                {done ? '✓' : n + 1}
              </span>
              <span className="min-w-0 pt-0.5">
                <span className={cn('block text-[15px] font-semibold leading-snug transition-colors', active ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700')}>{s.title}</span>
                <span className={cn('grid transition-all duration-300', active ? 'mt-1 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                  <span className="overflow-hidden text-sm leading-relaxed text-slate-600">{s.caption}</span>
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )

  return (
    <div ref={root} className={cn('grid items-start gap-10', !stacked && 'lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]')}>
      {/* On phones the device comes first, the steps under it; side by side from lg */}
      <div className={cn(!stacked && 'order-2 lg:sticky lg:top-28 lg:order-1')}>{rail}</div>
      <div className={cn('relative', !stacked && 'order-1 lg:order-2')}>
        {/* stage */}
        <div aria-hidden className="pointer-events-none absolute inset-x-4 inset-y-6 -z-0 rounded-[3rem] bg-[radial-gradient(60%_60%_at_50%_40%,color-mix(in_srgb,var(--offer-accent)_22%,transparent),transparent_70%)] blur-2xl" />
        <div className="relative grid">
          {slides.map((slide, n) => (
            <div
              key={n}
              aria-hidden={n !== i}
              className={cn('col-start-1 row-start-1 transition-all duration-500 ease-out', n === i ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-2 opacity-0')}
            >
              {slide}
            </div>
          ))}
        </div>
        <div className="relative mt-6 flex items-center justify-center gap-4 text-sm text-slate-600">
          <button type="button" onClick={() => go(i - 1)} disabled={i === 0} aria-label={labels.prev} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-900/10 transition hover:shadow disabled:opacity-35">
            {rtl ? '→' : '←'}
          </button>
          <span className="flex items-center gap-1.5" aria-label={`${labels.step} ${i + 1} ${labels.of} ${slides.length}`}>
            {slides.map((_, n) => (
              <button key={n} type="button" onClick={() => go(n)} aria-label={`${labels.step} ${n + 1}`} className={cn('h-1.5 rounded-full transition-all duration-300', n === i ? 'w-6 bg-[var(--offer-accent)]' : 'w-1.5 bg-slate-300 hover:bg-slate-400')} />
            ))}
          </span>
          <button type="button" onClick={() => go(i + 1)} disabled={i === last} aria-label={labels.next} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-35">
            {rtl ? '←' : '→'}
          </button>
        </div>
      </div>
    </div>
  )
}
