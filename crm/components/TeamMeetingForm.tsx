'use client'

import { useEffect, useState, useTransition } from 'react'
import { checkInviteTime, createTeamMeeting } from '@/app/actions/bookings'
import { DateTimeField } from '@/components/DateTimeField'
import { zonedInputToDate } from '@/lib/time'
import { TeammatePicker } from '@/components/TeammatePicker'
import { Button } from '@/components/ui/button'
import { Input, Label, Select, Textarea } from '@/components/ui/input'

export function TeamMeetingForm({ teammates, adminsOnly, defaultDuration = 30, timeZone }: { timeZone: string; teammates: { id: string; label: string }[]; adminsOnly: boolean; defaultDuration?: number }): React.ReactElement {
  const [title, setTitle] = useState('Team call')
  const [notes, setNotes] = useState('')
  const [ids, setIds] = useState<string[]>([])
  const [when, setWhen] = useState('')
  const [fieldKey, setFieldKey] = useState(0)
  const [duration, setDuration] = useState(defaultDuration)
  const [note, setNote] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string; link?: string | null } | null>(null)
  const [sending, startSend] = useTransition()
  const startDate = when ? zonedInputToDate(when, timeZone) : null
  const startIso = startDate && !Number.isNaN(startDate.getTime()) ? startDate.toISOString() : null

  useEffect(() => {
    setNote(null)
    if (!startIso) return
    setChecking(true)
    let stale = false
    const t = setTimeout(async () => {
      const res = await checkInviteTime({ startTime: startIso, durationMinutes: duration, teammateIds: ids })
      if (stale) return
      setChecking(false)
      setNote(res.ok ? res.data.note : res.error)
    }, 350)
    return () => {
      stale = true
      clearTimeout(t)
    }
  }, [startIso, duration, ids])

  function submit(e: React.FormEvent): void {
    e.preventDefault()
    if (!startIso) return setMessage({ kind: 'error', text: 'Choose a date and time first.' })
    startSend(async () => {
      const res = await createTeamMeeting({ title, notes: notes || undefined, startTime: startIso, durationMinutes: duration, teammateIds: ids })
      if (res.ok) {
        setMessage(res.data.requested ? { kind: 'ok', text: '✓ Request sent. The time is held and the admins you picked were emailed. You will see it as “Needs approval” on Meetings until one approves it.' } : { kind: 'ok', text: '✓ Booked. Your teammates were emailed the Meet link and can join as soon as it starts.', link: res.data.meetUrl })
        setIds([])
        setWhen('')
        setFieldKey((k) => k + 1)
      } else setMessage({ kind: 'error', text: res.error })
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Teammates</Label>
          <TeammatePicker teammates={teammates} value={ids} onChange={setIds} />
          <p className="text-xs text-muted-foreground">{adminsOnly ? 'You can request a call with admins. An admin has to approve it before the Meet is created.' : 'Anyone on the team. They get the Meet link by email straight away, with nothing to approve.'}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tm-title">Meeting title</Label>
          <Input id="tm-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tm-notes">Note (optional)</Label>
          <Textarea id="tm-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="tm-when-day">Date and time</Label>
            <DateTimeField key={fieldKey} idPrefix="tm-when" onChange={setWhen} timeZone={timeZone} />
            <p className="text-xs text-muted-foreground">Times are in your time zone ({timeZone.replaceAll('_', ' ')}).</p>
          </div>
          <div className="col-span-2 space-y-2 sm:col-span-1">
            <Label htmlFor="tm-duration">Length</Label>
            <Select id="tm-duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {[...new Set([15, 30, 45, 60, 90, defaultDuration])].sort((a, b) => a - b).map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </Select>
          </div>
        </div>
        {note ? <p className="text-xs text-amber-300">{note}</p> : startIso && !checking ? <p className="text-xs text-muted-foreground">✓ You and everyone you added are free at this time.</p> : null}
        <Button type="submit" className="w-full" disabled={sending || !startIso || checking || Boolean(note) || ids.length === 0}>
          {sending ? (adminsOnly ? 'Sending…' : 'Booking…') : ids.length === 0 ? 'Select a teammate to continue' : startIso ? (adminsOnly ? 'Request team meeting' : 'Book team meeting') : 'Choose a time to continue'}
        </Button>
        {message ? (
          <p className={message.kind === 'ok' ? 'text-sm text-green-400' : 'text-sm text-red-400'}>
            {message.text}{' '}
            {message.link ? (
              <a href={message.link} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                Open Meet
              </a>
            ) : null}
          </p>
        ) : null}
      </div>
    </form>
  )
}
