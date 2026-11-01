'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { bookTeamMeeting, importTeamMeetingsAction } from '@/app/admin/team-meetings/actions'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'

/** Book a team Google Meet, or import recent team calls (and their Gemini notes) from Google Calendar. Admin page only. */
export function TeamMeetingForm({ people }: { people: { id: string; label: string }[] }): React.ReactElement {
  const router = useRouter()
  const [title, setTitle] = useState('Team meeting')
  const [when, setWhen] = useState('')
  const [duration, setDuration] = useState(30)
  const [picked, setPicked] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const [importing, startImport] = useTransition()

  const book = (): void =>
    start(async () => {
      setMsg(null)
      if (!when) return setMsg({ ok: false, text: 'Pick a date and time.' })
      const r = await bookTeamMeeting({ title, startTime: new Date(when).toISOString(), durationMinutes: duration, attendeeIds: picked, notes: notes || undefined })
      if (!r.ok) return setMsg({ ok: false, text: r.error })
      setMsg({ ok: true, text: 'Booked. Google emailed the invites.' })
      router.refresh()
    })

  const importNow = (): void =>
    startImport(async () => {
      setMsg(null)
      const r = await importTeamMeetingsAction()
      if (!r.ok) return setMsg({ ok: false, text: r.error })
      setMsg({ ok: true, text: `Found ${r.data.found} team call(s), ${r.data.imported} new, ${r.data.withNotes} with Gemini notes.${r.data.found === 0 || r.data.diagnostics.some((d) => /missing|failed|Skipped/.test(d)) ? `\n${r.data.diagnostics.join('\n')}` : ''}` })
      router.refresh()
    })

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <Label htmlFor="tm-title">Title</Label>
          <Input id="tm-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </div>
        <div>
          <Label htmlFor="tm-when">Start</Label>
          <Input id="tm-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="tm-dur">Minutes</Label>
          <Input id="tm-dur" type="number" min={15} max={480} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 30)} />
        </div>
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-medium">Who&apos;s invited</legend>
        <div className="flex flex-wrap gap-2">
          {people.map((p) => (
            <label key={p.id} className="flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm">
              <input type="checkbox" checked={picked.includes(p.id)} onChange={(e) => setPicked((v) => (e.target.checked ? [...v, p.id] : v.filter((x) => x !== p.id)))} />
              {p.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <Label htmlFor="tm-notes">Agenda (optional)</Label>
        <Textarea id="tm-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={2} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={book} disabled={pending}>
          {pending ? 'Booking…' : 'Book meeting with team'}
        </Button>
        <Button variant="outline" onClick={importNow} disabled={importing}>
          {importing ? 'Importing…' : 'Import from my Google Calendar'}
        </Button>
        {msg ? <span className={`whitespace-pre-line text-sm ${msg.ok ? 'text-success' : 'text-destructive'}`}>{msg.text}</span> : null}
      </div>
    </div>
  )
}
