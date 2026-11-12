'use client'

import { AlarmClock, CalendarPlus, Check, Loader2, NotebookPen, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { createSalesInvite } from '@/app/actions/bookings'
import { callBookingInfo, freeTimesWithTeam } from '@/app/actions/call-actions'
import { briefMe } from '@/app/actions/follow-ups'
import { addNote, createTask } from '@/app/sales/actions'
import type { LeadBrief } from '@/lib/lead-brief'
import { cn } from '@/lib/utils'

type Panel = 'book' | 'note' | 'callback' | 'brief'

const ACTIONS: { key: Panel; label: string; Icon: typeof CalendarPlus }[] = [
  { key: 'book', label: 'Book', Icon: CalendarPlus },
  { key: 'note', label: 'Note', Icon: NotebookPen },
  { key: 'callback', label: 'Call back', Icon: AlarmClock },
  { key: 'brief', label: 'Brief', Icon: Sparkles },
]

const CHIP = 'rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium transition hover:bg-foreground/[0.05] disabled:opacity-50'
const CHIP_ON = 'border-foreground bg-foreground text-background hover:bg-foreground'
const FIELD = 'w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

/**
 * Quick actions while on a call with a contact: book a meeting at a time you and your teammates are all free, jot a note
 * on the contact, set a call-back, or read a short brief. Nothing reaches the client unless the rep presses Send.
 */
export function CallActions({ lead, onOpenChange }: { lead: { id: string; name: string }; onOpenChange?: (open: boolean) => void }): React.ReactElement {
  const [open, setOpenState] = useState<Panel | null>(null)
  const setOpen = (v: Panel | null): void => {
    setOpenState(v)
    onOpenChange?.(v !== null)
  }
  return (
    <div className="w-full">
      <div className="grid grid-cols-4 gap-1.5">
        {ACTIONS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setOpen(open === key ? null : key)}
            aria-pressed={open === key}
            className={cn('flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-medium transition', open === key ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground')}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
            {label}
          </button>
        ))}
      </div>
      {open ? (
        <div className="mt-2 max-h-[17rem] overflow-y-auto rounded-2xl border border-border/70 bg-foreground/[0.02] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold">{ACTIONS.find((a) => a.key === open)?.label}</span>
            <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="rounded-full p-1 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {open === 'book' ? <BookPanel lead={lead} /> : null}
          {open === 'note' ? <NotePanel lead={lead} /> : null}
          {open === 'callback' ? <CallbackPanel lead={lead} /> : null}
          {open === 'brief' ? <BriefPanel lead={lead} /> : null}
        </div>
      ) : null}
    </div>
  )
}

function Done({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <p className="flex items-start gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> <span>{children}</span>
    </p>
  )
}

function Problem({ children }: { children: React.ReactNode }): React.ReactElement {
  return <p className="text-xs text-rose-600 dark:text-rose-400">{children}</p>
}

/* ───────── book ───────── */

const ymd = (d: Date, tz: string): string => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)

function BookPanel({ lead }: { lead: { id: string; name: string } }): React.ReactElement {
  const [info, setInfo] = useState<{ email: string | null; guestName: string; teammates: { id: string; name: string }[]; timeZone: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const tz = info?.timeZone ?? 'Asia/Jerusalem'
  const [opened] = useState(() => Date.now())
  const days = useMemo(() => {
    const out: { key: string; label: string }[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(opened + i * 86_400_000)
      out.push({ key: ymd(d, tz), label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric' }).format(d) })
    }
    return out
  }, [tz, opened])
  const [day, setDay] = useState<string | null>(null)
  const [length, setLength] = useState(30)
  const [team, setTeam] = useState<string[]>([])
  const [slots, setSlots] = useState<{ key: string; list: string[]; unchecked: string[]; error?: string } | null>(null)
  const [pick, setPick] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('Igani call')
  const [sent, setSent] = useState<string | null>(null)
  const [pending, start] = useTransition()

  useEffect(() => {
    let stale = false
    void callBookingInfo(lead.id).then((r) => {
      if (stale) return
      if (!r.ok) return setError(r.error)
      setInfo(r.data)
      setEmail(r.data.email ?? '')
      setTitle(`Igani call with ${r.data.guestName}`)
    })
    return () => {
      stale = true
    }
  }, [lead.id])

  const chosenDay = day ?? days[0]!.key
  const query = `${chosenDay}|${length}|${team.join(',')}`
  useEffect(() => {
    if (!info) return
    let stale = false
    void freeTimesWithTeam({ date: chosenDay, durationMinutes: length, teammateIds: team }).then((r) => {
      if (stale) return
      if (r.ok) setSlots({ key: query, list: r.data.slots, unchecked: r.data.unchecked })
      else setSlots({ key: query, list: [], unchecked: [], error: /google|calendar|token|grant/i.test(r.error) ? 'Your Google Calendar isn’t connected, so free times can’t be checked. Connect Google in your profile, or book from the Invite page.' : r.error })
    })
    return () => {
      stale = true
    }
  }, [info, chosenDay, length, team, query])

  if (error && !info) return <Problem>{error}</Problem>
  if (!info) return <Loading />
  if (sent) return <Done>{sent}</Done>
  const loading = !slots || slots.key !== query
  const time = (iso: string): string => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
  const when = pick ? `${new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(pick))}, ${time(pick)}` : ''

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {days.map((d) => (
          <button key={d.key} type="button" onClick={() => (setDay(d.key), setPick(null))} className={cn(CHIP, 'shrink-0', chosenDay === d.key && CHIP_ON)}>
            {d.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {[30, 45, 60].map((m) => (
          <button key={m} type="button" onClick={() => (setLength(m), setPick(null))} className={cn(CHIP, length === m && CHIP_ON)}>
            {m} min
          </button>
        ))}
      </div>
      {info.teammates.length ? (
        <div>
          <p className="mb-1 text-[11px] text-muted-foreground">With teammates (only times they’re free too)</p>
          <div className="flex flex-wrap gap-1.5">
            {info.teammates.map((t) => {
              const on = team.includes(t.id)
              return (
                <button key={t.id} type="button" onClick={() => (setTeam((x) => (on ? x.filter((i) => i !== t.id) : [...x, t.id])), setPick(null))} className={cn(CHIP, on && CHIP_ON)} aria-pressed={on}>
                  {t.name}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
      <div>
        <p className="mb-1 text-[11px] text-muted-foreground">{team.length ? 'Free for everyone' : 'You’re free'}</p>
        {loading ? (
          <Loading text="Checking calendars…" />
        ) : slots.error ? (
          <Problem>{slots.error}</Problem>
        ) : slots.list.length ? (
          <div className="grid grid-cols-4 gap-1.5">
            {slots.list.map((s) => (
              <button key={s} type="button" onClick={() => setPick(s)} className={cn('rounded-lg border border-border/70 py-1.5 text-xs tabular-nums transition hover:bg-foreground/[0.05]', pick === s && CHIP_ON)}>
                {time(s)}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No time {team.length ? 'when everyone’s free' : 'free'} that day. Try another day{team.length ? ' or fewer teammates' : ''}.
          </p>
        )}
        {slots && !loading && slots.unchecked.length ? <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Couldn’t read {slots.unchecked.join(', ')}’s Google Calendar; only their CRM meetings were checked.</p> : null}
      </div>
      {pick ? (
        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="text-xs font-medium">
            {when} · {length} min
          </p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={FIELD} aria-label="Meeting title" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Client’s email" className={FIELD} aria-label="Client email" />
          {error ? <Problem>{error}</Problem> : null}
          <button
            type="button"
            disabled={pending || !email.trim()}
            onClick={() => {
              setError(null)
              start(async () => {
                const r = await createSalesInvite({ leadId: lead.id, guestName: info.guestName, guestEmail: email.trim(), startTime: pick, durationMinutes: length, title: title.trim() || 'Igani call', teammateIds: team })
                if (r.ok) setSent(`Invite sent to ${email.trim()} for ${when}. They accept from the email; the Meet link follows.`)
                else setError(r.error)
              })
            }}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />} Send invite
          </button>
          <p className="text-[11px] text-muted-foreground">The client gets an email to accept this time. It holds the slot for you{team.length ? ' and your teammates' : ''} until then.</p>
        </div>
      ) : null}
    </div>
  )
}

/* ───────── note ───────── */

function NotePanel({ lead }: { lead: { id: string; name: string } }): React.ReactElement {
  const [text, setText] = useState('')
  const [done, setDone] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <div className="space-y-2">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={`A note on ${lead.name}…`} dir="auto" className={FIELD} aria-label="Note" />
      {error ? <Problem>{error}</Problem> : done ? <Done>Saved on {lead.name}’s timeline.</Done> : null}
      <button
        type="button"
        disabled={pending || !text.trim()}
        onClick={() => {
          setError(null)
          start(async () => {
            const r = await addNote(lead.id, text.trim())
            if (r.ok) {
              setText('')
              setDone((n) => n + 1)
            } else setError(r.error)
          })
        }}
        className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-1.5 text-xs font-medium text-background transition disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <NotebookPen className="h-3.5 w-3.5" />} Save note
      </button>
    </div>
  )
}

/* ───────── call back ───────── */

function callbackTimes(now = new Date()): { label: string; at: Date }[] {
  const at = (days: number, h: number): Date => {
    const d = new Date(now)
    d.setDate(d.getDate() + days)
    d.setHours(h, 0, 0, 0)
    return d
  }
  const monday = (8 - now.getDay()) % 7 || 7
  return [
    { label: 'In 1 hour', at: new Date(now.getTime() + 3_600_000) },
    { label: 'Tomorrow 10:00', at: at(1, 10) },
    { label: 'In 3 days', at: at(3, 10) },
    { label: 'Next week', at: at(monday, 10) },
  ]
}

function CallbackPanel({ lead }: { lead: { id: string; name: string } }): React.ReactElement {
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const fmt = (d: Date): string => new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d)
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {callbackTimes().map((c) => (
          <button
            key={c.label}
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null)
              start(async () => {
                const r = await createTask(lead.id, `Call back ${lead.name}`, c.at.toISOString(), 'HIGH')
                if (r.ok) setDone(`Call-back task for ${fmt(c.at)}. It’ll be on your Today page.`)
                else setError(r.error)
              })
            }}
            className={cn(CHIP, 'rounded-xl py-2')}
          >
            {c.label}
          </button>
        ))}
      </div>
      {error ? <Problem>{error}</Problem> : done ? <Done>{done}</Done> : null}
    </div>
  )
}

/* ───────── brief ───────── */

function BriefPanel({ lead }: { lead: { id: string; name: string } }): React.ReactElement {
  const [brief, setBrief] = useState<LeadBrief | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let stale = false
    void briefMe(lead.id).then((r) => {
      if (stale) return
      if (r.ok) setBrief(r.data)
      else setError(r.error)
    })
    return () => {
      stale = true
    }
  }, [lead.id])
  if (error) return <Problem>{error}</Problem>
  if (!brief) return <Loading text="Reading the history…" />
  return (
    <div className="space-y-2 text-xs leading-relaxed" dir={brief.lang === 'he' ? 'rtl' : 'ltr'}>
      <p>{brief.standing}</p>
      {brief.nextStep ? <p className="rounded-lg bg-primary/10 px-2.5 py-1.5 font-medium">{brief.nextStep}</p> : null}
      {brief.objections.length ? <p className="text-muted-foreground">Objections: {brief.objections.join(' · ')}</p> : null}
      {brief.openPromises.length ? <p className="text-muted-foreground">Open: {brief.openPromises.map((p) => p.text).join(' · ')}</p> : null}
    </div>
  )
}

function Loading({ text = 'Loading…' }: { text?: string }): React.ReactElement {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> {text}
    </p>
  )
}
