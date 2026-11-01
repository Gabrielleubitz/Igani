'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { CalendarDays, Clock } from 'lucide-react'
import { Calendar } from '@/components/ui/event-calendar/primitives/calendar'
import { cn } from '@/lib/utils'

const pad = (n: number): string => String(n).padStart(2, '0')
const toIsoDay = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parseDay = (s: string): Date | undefined => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10))) : undefined)
const SLOTS = Array.from({ length: 48 }, (_, i) => `${pad(Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`)
const label12 = (t: string): string => {
  const h = Number(t.slice(0, 2))
  return `${h % 12 || 12}:${t.slice(3, 5)} ${h < 12 ? 'AM' : 'PM'}`
}

/**
 * Date (and optionally time) picker: a trigger button that opens a calendar next to a scrollable list of time slots.
 * Value is "YYYY-MM-DD" (mode "date") or "YYYY-MM-DDTHH:mm" (mode "datetime"); "" when empty.
 * The panel opens inline below the trigger so it never gets clipped inside dialogs.
 */
export function DateTimePicker({
  value,
  onChange,
  mode = 'datetime',
  min,
  id,
  'aria-label': ariaLabel,
  placeholder,
  className,
  clearable,
}: {
  value: string
  onChange: (value: string) => void
  mode?: 'date' | 'datetime'
  /** Earliest selectable day, YYYY-MM-DD. */
  min?: string
  id?: string
  'aria-label'?: string
  placeholder?: string
  className?: string
  /** Show a Clear button (for optional values). */
  clearable?: boolean
}): React.ReactElement {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const dayStr = value.slice(0, 10)
  const time = mode === 'datetime' ? value.slice(11, 16) : ''
  const selected = parseDay(dayStr)
  const minDay = min ? parseDay(min) : undefined
  const slots = useMemo(() => (time && !SLOTS.includes(time) ? [...SLOTS, time].sort() : SLOTS), [time])
  const timeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    timeRef.current?.scrollIntoView({ block: 'center' })
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    const onClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('mousedown', onClick)
    }
  }, [open])

  const pickDay = (d: Date | undefined): void => {
    if (!d) return
    const day = toIsoDay(d)
    if (mode === 'date') {
      onChange(day)
      setOpen(false)
    } else onChange(`${day}T${time || '09:00'}`)
  }
  const pickTime = (t: string): void => onChange(`${dayStr || toIsoDay(minDay ?? new Date())}T${t}`)

  const text = selected
    ? `${selected.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}${time ? `, ${label12(time)}` : ''}`
    : (placeholder ?? (mode === 'date' ? 'Pick a date' : 'Pick date & time'))

  return (
    <div ref={ref} className={cn('space-y-2', className)}>
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-muted-foreground')}>{text}</span>
        {mode === 'datetime' ? <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
      </button>
      {open ? (
        <div id={panelId} role="dialog" aria-label="Choose date and time" className="flex max-w-full flex-col overflow-hidden rounded-xl border bg-card shadow-lg sm:flex-row">
          <div className="flex justify-center p-2">
            <Calendar mode="single" selected={selected} onSelect={pickDay} defaultMonth={selected ?? minDay} disabled={minDay ? { before: minDay } : undefined} />
          </div>
          {mode === 'datetime' ? (
            <div className="border-t sm:w-32 sm:border-l sm:border-t-0">
              <div className="flex items-center gap-1.5 px-3 pt-3 text-xs font-medium text-muted-foreground">
                <Clock className="size-3.5" aria-hidden /> Time
              </div>
              <div role="listbox" aria-label="Time" className="grid max-h-40 grid-cols-3 gap-1 overflow-y-auto p-2 sm:max-h-[17rem] sm:grid-cols-1">
                {slots.map((t) => (
                  <button
                    key={t}
                    ref={t === time ? timeRef : undefined}
                    type="button"
                    role="option"
                    aria-selected={t === time}
                    onClick={() => pickTime(t)}
                    className={cn('rounded-md border px-2 py-1.5 text-xs transition-colors', t === time ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted')}
                  >
                    {label12(t)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {open && (mode === 'datetime' || (clearable && value)) ? (
        <div className="flex gap-2">
          {clearable && value ? (
            <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="rounded-md border px-3 py-2 text-sm hover:bg-muted">
              Clear
            </button>
          ) : null}
          {mode === 'datetime' ? (
            <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Done
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
