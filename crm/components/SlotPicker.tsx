'use client'

import { Button } from '@/components/ui/button'

export function SlotPicker({
  slots,
  selected,
  onSelect,
  timeZone,
}: {
  slots: string[]
  selected: string | null
  onSelect: (iso: string) => void
  timeZone?: string
}): React.ReactElement {
  if (slots.length === 0) return <p className="text-sm text-muted-foreground">No open times on this day.</p>
  const fmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone })
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((s) => (
        <Button key={s} type="button" size="sm" variant={selected === s ? 'default' : 'outline'} onClick={() => onSelect(s)}>
          {fmt.format(new Date(s))}
        </Button>
      ))}
    </div>
  )
}

export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
