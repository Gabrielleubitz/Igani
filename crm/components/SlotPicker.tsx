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
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2" role="radiogroup" aria-label="Available times">
        {slots.map((s) => (
          <Button key={s} type="button" role="radio" aria-checked={selected === s} size="sm" variant={selected === s ? 'default' : 'outline'} className="h-auto min-h-9 flex-col gap-0 whitespace-nowrap px-2 py-1.5" onClick={() => onSelect(s)}>
            {otherDay(s) ? <span className="text-[10px] font-normal leading-tight opacity-80">{day.format(new Date(s))}</span> : null}
            <span>{time.format(new Date(s))}</span>
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
