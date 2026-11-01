'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarClock, ExternalLink, FileText, Mail, Phone, Building2, User, Users, Video, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { createCalendarEntry, deleteCalendarEntry } from '@/app/sales/today/actions'
import { Button, buttonVariants } from '@/components/ui/button'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { Dialog } from '@/components/ui/dialog'
import { EventCalendar, type EventCalendarProps } from '@/components/ui/event-calendar/event-calendar'
import { EventCalendarContent } from '@/components/ui/event-calendar/event-calendar-content'
import { EventCalendarNav, EventCalendarNavNext, EventCalendarNavPrev, EventCalendarNavToday, EventCalendarTitle } from '@/components/ui/event-calendar/event-calendar-nav'
import type { CalendarEvent, CalendarView, EventCalendarOccurrence } from '@/components/ui/event-calendar/event-calendar-types'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
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
  details?: ItemDetails
}

export interface ItemDetails {
  type: string
  host?: string
  guest?: string
  guestEmail?: string
  phone?: string
  company?: string
  attendees?: string[]
  synced?: string
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
  const [form, setForm] = useState<{ start: string; durationMin: number; allDay: boolean } | null>(null)
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
  // Viewing today: the grid starts one hour before now (past hours hidden) so the red now-line sits near the top.
  const [tick, setTick] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setTick(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])
  const startHour = useMemo(() => {
    const hourIn = (d: Date): string => new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(d)
    const dayKey = (d: Date): string => new Intl.DateTimeFormat('en-CA', { timeZone }).format(d)
    if (view !== 'day' || dayKey(date) !== dayKey(tick)) return 6
    return Math.min(Math.max(Number(hourIn(tick)), 0), 20)
  }, [view, date, tick, timeZone])
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])

  function openForm(start: Date, allDay: boolean, end?: Date): void {
    const s = new Date(start)
    if (!allDay && s.getMinutes() === 0 && s.getHours() === 0) s.setHours(9) // month cell click has no time of day
    const mins = end && !allDay ? Math.round((end.getTime() - s.getTime()) / 60_000) : 60
    setForm({ start: dateToZonedInput(s, timeZone), durationMin: mins >= 5 && mins <= 720 ? mins : 60, allDay })
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
        dayStartHour={startHour}
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

      <Dialog className="w-[min(92vw,34rem)]" open={form !== null} onClose={() => setForm(null)} title="New event" description="Added to your calendar and synced to Google Calendar if connected.">
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

      <Dialog open={selected !== null} onClose={() => setSelected(null)} title={selected?.title ?? ''} description={selected?.details?.type} className="w-[min(92vw,34rem)]">
        {selected ? (
          <div className="space-y-4 text-sm">
            <div className="h-1 rounded-full" style={{ background: selected.color }} />
            <dl className="space-y-3">
              <Row icon={CalendarClock} label="When">
                {when(selected, timeZone)}
              </Row>
              {selected.details?.host ? (
                <Row icon={User} label="Host">
                  {selected.details.host}
                </Row>
              ) : null}
              {selected.details?.guest ? (
                <Row icon={User} label={selected.kind === 'task' ? 'Contact' : 'Guest'}>
                  {selected.details.guest}
                </Row>
              ) : null}
              {selected.details?.company ? (
                <Row icon={Building2} label="Company">
                  {selected.details.company}
                </Row>
              ) : null}
              {selected.details?.guestEmail ? (
                <Row icon={Mail} label="Email">
                  <a className="underline-offset-2 hover:underline" href={`mailto:${selected.details.guestEmail}`}>
                    {selected.details.guestEmail}
                  </a>
                </Row>
              ) : null}
              {selected.details?.phone ? (
                <Row icon={Phone} label="Phone">
                  <a className="underline-offset-2 hover:underline" href={`tel:${selected.details.phone}`}>
                    {selected.details.phone}
                  </a>
                </Row>
              ) : null}
              {selected.details?.attendees?.length ? (
                <Row icon={Users} label="Attendees">
                  {selected.details.attendees.join(', ')}
                </Row>
              ) : null}
              {selected.meetUrl ? (
                <Row icon={Video} label="Video call">
                  <a className="break-all underline-offset-2 hover:underline" href={selected.meetUrl} target="_blank" rel="noreferrer">
                    {selected.meetUrl}
                  </a>
                </Row>
              ) : null}
              {selected.details?.synced ? (
                <Row icon={RefreshCw} label="Google">
                  {selected.details.synced}
                </Row>
              ) : null}
              {selected.notes ? (
                <Row icon={FileText} label="Notes">
                  <span className="whitespace-pre-wrap">{selected.notes}</span>
                </Row>
              ) : null}
            </dl>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
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
              <div className="grow" />
              {selected.meetUrl ? (
                <a href={selected.meetUrl} target="_blank" rel="noreferrer" className={buttonVariants({ size: 'sm' })}>
                  <Video className="size-4" /> Join
                </a>
              ) : null}
              {selected.href ? (
                <Link href={selected.href} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                  <ExternalLink className="size-4" /> Open contact
                </Link>
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

function Row({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="mt-0.5">{children}</dd>
      </div>
    </div>
  )
}

function when(i: CalendarItem, timeZone: string): string {
  const s = new Date(i.start)
  const e = new Date(i.end)
  const day = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  if (i.allDay) return `${day.format(s)} · all day`
  const t = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' })
  const mins = Math.round((e.getTime() - s.getTime()) / 60000)
  const dur = mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}` : `${mins}m`
  return `${day.format(s)}, ${t.format(s)} – ${t.format(e)} (${dur})`
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

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240]

function fmtDuration(m: number): string {
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} hr ${r} min` : h === 1 ? '1 hr' : `${h} hr`
}

/** End time of a wall-clock start + duration, for display only (the server computes the real end). */
function endLabel(start: string, minutes: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(start)
  if (!m) return '—'
  const d = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!) + minutes * 60_000)
  return d.toLocaleString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function EntryForm({ initial, onDone, onCancel }: { initial: { start: string; durationMin: number; allDay: boolean }; onDone: () => void; onCancel: () => void }): React.ReactElement {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [allDay, setAllDay] = useState(initial.allDay)
  const [start, setStart] = useState(initial.start)
  const [duration, setDuration] = useState(initial.durationMin)
  const [days, setDays] = useState(1)
  const [color, setColor] = useState<EntryColor>('blue')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const mode = allDay ? 'date' : 'datetime'
  const val = (v: string): string => (allDay ? v.slice(0, 10) : v.length === 10 ? `${v}T09:00` : v)

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        startTransition(async () => {
          const r = await createCalendarEntry({ title, notes: notes || undefined, allDay, start: val(start), durationMin: allDay ? days * 1440 : duration, color })
          if (!r.ok) return setError(r.error)
          if (!r.data.googleSynced) window.alert('Saved in the CRM, but it could not be added to your Google Calendar. Open Connect Google and reconnect, then reload this page to retry.')
          onDone()
        })
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="ev-title">Title</Label>
        <Input id="ev-title" required autoFocus maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Call Dana, prep demo…" />
      </div>
      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 accent-primary" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> All day
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ev-start">Starts</Label>
          <DateTimePicker id="ev-start" mode={mode} value={val(start)} onChange={setStart} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-duration">{allDay ? 'Length' : 'Meeting duration'}</Label>
          {allDay ? (
            <Select id="ev-duration" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7, 14].map((n) => (
                <option key={n} value={n}>{n === 1 ? '1 day' : `${n} days`}</option>
              ))}
            </Select>
          ) : (
            <Select id="ev-duration" value={DURATIONS.includes(duration) ? duration : 'custom'} onChange={(e) => setDuration(e.target.value === 'custom' ? 90 : Number(e.target.value))}>
              {DURATIONS.map((m) => (
                <option key={m} value={m}>{fmtDuration(m)}</option>
              ))}
              {DURATIONS.includes(duration) ? null : <option value="custom">{fmtDuration(duration)}</option>}
            </Select>
          )}
          {!allDay ? <p className="text-xs text-muted-foreground">Ends at {endLabel(start, duration)}</p> : null}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ev-notes">Notes (optional)</Label>
        <Textarea id="ev-notes" rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="flex items-center gap-3" role="radiogroup" aria-label="Color">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Color</span>
        {ENTRY_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={c}
            onClick={() => setColor(c)}
            className={cn('size-6 rounded-full transition-transform hover:scale-110 ring-offset-2 ring-offset-card', color === c && 'ring-2 ring-foreground')}
            style={{ background: entryColorVar(c) }}
          />
        ))}
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <div className="flex justify-end gap-2 border-t pt-4">
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
