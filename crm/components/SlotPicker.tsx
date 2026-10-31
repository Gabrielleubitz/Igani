'use client'

import { Button } from '@/components/ui/button'

export function SlotPicker({
  slots,
  selected,
  onSelect,
  timeZone,
  date,
}: {
  slots: string[]
  selected: string | null
  onSelect: (iso: string) => void
  timeZone?: string
  /** The YYYY-MM-DD the user picked; slots on another date in the viewer's zone are labelled with their day. */
  date?: string
}): React.ReactElement {
  const zone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  if (slots.length === 0) return <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">No open times on this day. Try another date.</p>
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: zone })
  const day = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: zone })
  const key = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: zone })
  const otherDay = (iso: string): boolean => Boolean(date) && key.format(new Date(iso)) !== date
  const fmt = { format: (d: Date): string => (otherDay(d.toISOString()) ? `${day.format(d)}, ${time.format(d)}` : time.format(d)) }
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Available times">
        {slots.map((s) => (
          <Button key={s} type="button" role="radio" aria-checked={selected === s} size="sm" variant={selected === s ? 'default' : 'outline'} onClick={() => onSelect(s)}>
            {fmt.format(new Date(s))}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Times shown in your time zone ({zone.replaceAll('_', ' ')}).{slots.some(otherDay) ? ' Because of the time difference, some fall on a different day, which is shown.' : ''}
      </p>
    </div>
  )
}

export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
