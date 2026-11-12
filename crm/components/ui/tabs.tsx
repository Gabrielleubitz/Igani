'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'

export interface TabItem<T extends string> {
  id: T
  label: string
  /** a small count after the label */
  count?: number
}

/** A row of tabs (role tablist) with arrow-key movement. The panel is up to the caller: render it under the bar with role="tabpanel". */
export function TabBar<T extends string>({ items, value, onChange, label, className }: { items: TabItem<T>[]; value: T; onChange: (id: T) => void; label: string; className?: string }): React.ReactElement {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const index = items.findIndex((i) => i.id === value)
  const move = (to: number): void => {
    const next = (to + items.length) % items.length
    onChange(items[next]!.id)
    refs.current[next]?.focus()
  }
  return (
    <div role="tablist" aria-label={label} className={cn('flex gap-1 overflow-x-auto border-b', className)}>
      {items.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="button"
          role="tab"
          id={`tab-${t.id}`}
          aria-selected={t.id === value}
          tabIndex={t.id === value ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') (e.preventDefault(), move(index + 1))
            else if (e.key === 'ArrowLeft') (e.preventDefault(), move(index - 1))
            else if (e.key === 'Home') (e.preventDefault(), move(0))
            else if (e.key === 'End') (e.preventDefault(), move(items.length - 1))
          }}
          className={cn(
            '-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
            t.id === value ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {t.label}
          {t.count ? <span className="ml-1.5 rounded-full bg-muted px-1.5 py-px text-[11px] tabular-nums text-muted-foreground">{t.count}</span> : null}
        </button>
      ))}
    </div>
  )
}
