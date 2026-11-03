'use client'

import { useState, type ReactNode } from 'react'
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

/** Steps through a flow's screens: numbered step list on one side, the device on the other. */
export function FlowPlayer({ steps, slides, rtl, labels, initialStep = 0, stacked = false }: FlowPlayerProps): React.ReactElement {
  const [i, setI] = useState(Math.min(Math.max(initialStep, 0), Math.max(slides.length - 1, 0)))
  const go = (n: number): void => setI(Math.min(Math.max(n, 0), slides.length - 1))
  return (
    <div className={cn('grid items-start gap-8', !stacked && 'md:grid-cols-[minmax(0,1fr)_auto]')}>
      <ol className={cn(stacked ? 'grid gap-2 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-2')}>
        {steps.map((s, n) => (
          <li key={n}>
            <button
              type="button"
              onClick={() => go(n)}
              aria-current={n === i ? 'step' : undefined}
              className={cn(
                'w-full rounded-xl border px-4 py-3 text-start transition-colors',
                n === i ? 'border-[var(--offer-accent)] bg-white shadow-sm' : 'border-transparent hover:bg-white/70',
              )}
            >
              <span className="flex items-baseline gap-3">
                <span className={cn('text-xs font-semibold tabular-nums', n === i ? 'text-[var(--offer-accent)]' : 'text-slate-400')}>{String(n + 1).padStart(2, '0')}</span>
                <span className="font-medium text-slate-900">{s.title}</span>
              </span>
              {n === i && s.caption ? <span className="mt-1 block ps-8 text-sm leading-relaxed text-slate-600">{s.caption}</span> : null}
            </button>
          </li>
        ))}
      </ol>
      <div className="flex flex-col items-center gap-4">
        {slides.map((slide, n) => (
          <div key={n} hidden={n !== i} className="w-full">
            {slide}
          </div>
        ))}
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <button type="button" onClick={() => go(i - 1)} disabled={i === 0} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 disabled:opacity-40">
            {rtl ? '→' : '←'} {labels.prev}
          </button>
          <span className="tabular-nums">
            {labels.step} {i + 1} {labels.of} {slides.length}
          </span>
          <button type="button" onClick={() => go(i + 1)} disabled={i === slides.length - 1} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 disabled:opacity-40">
            {labels.next} {rtl ? '←' : '→'}
          </button>
        </div>
      </div>
    </div>
  )
}
