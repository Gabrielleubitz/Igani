'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { createCalendarEntry, deleteCalendarEntry } from '@/app/sales/today/actions'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { EventCalendar, type EventCalendarProps } from '@/components/ui/event-calendar/event-calendar'
import { EventCalendarContent } from '@/components/ui/event-calendar/event-calendar-content'
import { EventCalendarNav, EventCalendarNavNext, EventCalendarNavPrev, EventCalendarNavToday, EventCalendarTitle } from '@/components/ui/event-calendar/event-calendar-nav'
import type { CalendarEvent, CalendarView, EventCalendarOccurrence } from '@/components/ui/event-calendar/event-calendar-types'
import { Input, Label, Textarea } from '@/components/ui/input'
import { ENTRY_COLORS, entryColorVar, type EntryColor } from '@/lib/calendar-entries'
import { cn } from '@/lib/utils'
import { dateToZonedInput } from '@/lib/time'

export interface CalendarItem {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  color: string
  /** entry = my own (can delete), booking = meeting (opens contact / join link), task = due task */
  kind: 'entry' | 'booking' | 'task'
  href?: string
  meetUrl?: string
  notes?: string
}

type Data = Pick<CalendarItem, 'kind' | 'href' | 'meetUrl' | 'notes'>

const VIEWS: { id: Extract<CalendarView, 'day' | 'month'>; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'month', label: 'Month' },
]

export function TodayCalendar({ items, timeZone }: { items: CalendarItem[]; timeZone: string }): React.ReactElement {
  const router = useRouter()
  const [view, setView] = useState<'day' | 'month'>('day')
  const [date, setDate] = useState(() => new Date())
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [form, setForm] = useState<{ start: string; end: string; allDay: boolean } | null>(null)
  const [selected, setSelected] = useState<CalendarItem | null>(null)

  const events = useMemo<CalendarEvent<Data>[]>(
    () =>
      items
        .filter((i) => !removed.has(i.id))
        .map((i) => ({
          id: i.id,
          title: i.title,
          start: new Date(i.start),
          end: new Date(i.end),
          allDay: i.allDay,
          color: i.color,
          readOnly: true,
          data: { kind: i.kind, href: i.href, meetUrl: i.meetUrl, notes: i.notes },
        })),
    [items, removed],
  )
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])

  function openForm(start: Date, allDay: boolean, end?: Date): void {
    const s = new Date(start)
    if (!allDay && s.getMinutes() === 0 && s.getHours() === 0) s.setHours(9) // month cell click has no time of day
    const e = end ?? new Date(s.getTime() + 3600_000)
    setForm({ start: dateToZonedInput(s, timeZone), end: dateToZonedInput(e, timeZone), allDay })
  }

  const onSlotClick: NonNullable<EventCalendarProps<Data>['onSlotClick']> = (slot) => {
    openForm(slot.date, slot.allDay, slot.end)
  }
  const onEventClick = (o: EventCalendarOccurrence<Data>): void => setSelected(byId.get(o.eventId) ?? null)

  return (
    <div className="rounded-lg border bg-card">
      <EventCalendar<Data>
        className="h-[34rem] text-sm"
        events={events}
        view={view}
        onViewChange={(v) => setView(v === 'month' ? 'month' : 'day')}
        date={date}
        onDateChange={setDate}
        views={['day', 'month']}
        timeZone={timeZone}
        dayStartHour={6}
        dayEndHour={22}
        interactions={{ drag: false, resize: false, selectSlot: false }}
        onSlotClick={onSlotClick}
        onEventClick={onEventClick}
        fixedWeeks={false}
      >
        <EventCalendarNav showViewSwitcher={false}>
          <EventCalendarNavToday />
          <div className="flex items-center">
            <EventCalendarNavPrev />
            <EventCalendarNavNext />
          </div>
          <EventCalendarTitle className="ms-2" />
          <div className="grow" />
          <div role="group" aria-label="Calendar view" className="flex rounded-md border p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={view === v.id}
                onClick={() => setView(v.id)}
                className={cn('rounded px-3 py-1 text-sm font-medium transition-colors', view === v.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
              >
                {v.label}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => openForm(new Date(), false)}>
            + Add event
          </Button>
        </EventCalendarNav>
        <EventCalendarContent />
      </EventCalendar>

      <Dialog open={form !== null} onClose={() => setForm(null)} title="New event" description="Added to your calendar only. Click any empty time slot or day to start one.">
        {form ? (
          <EntryForm
            initial={form}
            onDone={() => {
              setForm(null)
              router.refresh()
            }}
            onCancel={() => setForm(null)}
          />
        ) : null}
      </Dialog>

      <Dialog open={selected !== null} onClose={() => setSelected(null)} title={selected?.title ?? ''} description={selected ? describe(selected, timeZone) : undefined}>
        {selected ? (
          <div className="space-y-3 text-sm">
            {selected.notes ? <p className="whitespace-pre-wrap text-muted-foreground">{selected.notes}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              {selected.meetUrl ? (
                <a href={selected.meetUrl} target="_blank" rel="noreferrer" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                  Join
                </a>
              ) : null}
              {selected.href ? (
                <Link href={selected.href} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                  {selected.kind === 'task' ? 'Open contact' : 'Open'}
                </Link>
              ) : null}
              {selected.kind === 'entry' ? (
                <DeleteButton
                  id={selected.id}
                  onDeleted={() => {
                    setRemoved((r) => new Set(r).add(selected.id))
                    setSelected(null)
                    router.refresh()
                  }}
                />
              ) : null}
              <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}

function describe(i: CalendarItem, timeZone: string): string {
  const f = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric', ...(i.allDay ? {} : { hour: 'numeric', minute: '2-digit' }) })
  const kind = i.kind === 'task' ? 'Task due' : i.kind === 'booking' ? 'Meeting' : 'Event'
  return `${kind} · ${f.format(new Date(i.start))}${i.allDay ? ' · all day' : ''}`
}

function DeleteButton({ id, onDeleted }: { id: string; onDeleted: () => void }): React.ReactElement {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <>
      {error ? <span className="mr-auto text-xs text-red-400">{error}</span> : null}
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await deleteCalendarEntry(id)
            if (r.ok) onDeleted()
            else setError(r.error)
          })
        }
      >
        {pending ? 'Deleting…' : 'Delete'}
      </Button>
    </>
  )
}

function EntryForm({ initial, onDone, onCancel }: { initial: { start: string; end: string; allDay: boolean }; onDone: () => void; onCancel: () => void }): React.ReactElement {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [allDay, setAllDay] = useState(initial.allDay)
  const [start, setStart] = useState(initial.start)
  const [end, setEnd] = useState(initial.end)
  const [color, setColor] = useState<EntryColor>('blue')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const type = allDay ? 'date' : 'datetime-local'
  const val = (v: string): string => (allDay ? v.slice(0, 10) : v.length === 10 ? `${v}T09:00` : v)

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        startTransition(async () => {
          const r = await createCalendarEntry({ title, notes: notes || undefined, allDay, start: val(start), end: val(end), color })
          if (!r.ok) return setError(r.error)
          onDone()
        })
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="ev-title">Title</Label>
        <Input id="ev-title" required autoFocus maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Call Dana, prep demo…" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> All day
      </label>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ev-start">Starts</Label>
          <Input id="ev-start" type={type} required value={val(start)} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-end">Ends</Label>
          <Input id="ev-end" type={type} required value={val(end)} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ev-notes">Notes (optional)</Label>
        <Textarea id="ev-notes" rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="flex items-center gap-2" role="radiogroup" aria-label="Color">
        {ENTRY_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={c}
            onClick={() => setColor(c)}
            className={cn('size-6 rounded-full ring-offset-2 ring-offset-card', color === c && 'ring-2 ring-foreground')}
            style={{ background: entryColorVar(c) }}
          />
        ))}
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Saving…' : 'Add event'}
        </Button>
      </div>
    </form>
  )
}
