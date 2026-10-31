'use client'

import { useEffect, useState, useTransition } from 'react'
import { checkInviteTime, createSalesInvite } from '@/app/actions/bookings'
import { Button } from '@/components/ui/button'
import { Input, Label, Select, Textarea } from '@/components/ui/input'

interface LeadOption {
  id: string
  name: string
  email: string
  company?: string | null
}

export function InviteForm({ leads, initialLeadId, defaultDuration = 30, hosts = [], currentUserId, teammates = [], teammatesAreAdminsOnly = false }: { leads: LeadOption[]; initialLeadId?: string; defaultDuration?: number; hosts?: { id: string; label: string }[]; currentUserId?: string; teammates?: { id: string; label: string }[]; teammatesAreAdminsOnly?: boolean }): React.ReactElement {
  const initial = leads.find((l) => l.id === initialLeadId)
  const [leadId, setLeadId] = useState(initial?.id ?? '')
  const [guestName, setGuestName] = useState(initial?.name ?? '')
  const [guestEmail, setGuestEmail] = useState(initial?.email ?? '')
  const [title, setTitle] = useState('Igani intro call')
  const [notes, setNotes] = useState('')
  // Typed by hand: any date and time (browser's local zone).
  const [when, setWhen] = useState('')
  const [duration, setDuration] = useState(defaultDuration)
  const [note, setNote] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [hostId, setHostId] = useState(currentUserId ?? '')
  const [teammateIds, setTeammateIds] = useState<string[]>([])
  const [sending, startSend] = useTransition()

  const startIso = when && !Number.isNaN(new Date(when).getTime()) ? new Date(when).toISOString() : null

  // Tell the user right away if the time clashes with another call.
  useEffect(() => {
    setNote(null)
    if (!startIso) return
    setChecking(true)
    let stale = false
    const t = setTimeout(async () => {
      const res = await checkInviteTime({ startTime: startIso, durationMinutes: duration, hostId: hostId || undefined })
      if (stale) return
      setChecking(false)
      if (res.ok) setNote(res.data.note)
      else setNote(res.error)
    }, 350)
    return () => {
      stale = true
      clearTimeout(t)
    }
  }, [startIso, duration, hostId])

  function pickLead(id: string): void {
    setLeadId(id)
    const lead = leads.find((l) => l.id === id)
    if (lead) {
      setGuestName(lead.name)
      setGuestEmail(lead.email)
    }
  }

  function submit(e: React.FormEvent): void {
    e.preventDefault()
    if (!startIso) return setMessage({ kind: 'error', text: 'Choose a date and time first.' })
    startSend(async () => {
      const res = await createSalesInvite({
        leadId: leadId || undefined,
        guestName,
        guestEmail,
        title,
        notes: notes || undefined,
        startTime: startIso,
        durationMinutes: duration,
        hostId: hostId || undefined,
        teammateIds: teammateIds.filter((id) => id !== hostId),
      })
      if (res.ok) {
        setMessage({ kind: 'ok', text: `✓ Invite sent to ${guestEmail}. The slot is held until they confirm; you'll see it under Meetings.` })
        setWhen('')
      } else setMessage({ kind: 'error', text: res.error })
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="lead">Contact</Label>
          <Select id="lead" value={leadId} onChange={(e) => pickLead(e.target.value)}>
            <option value="">New person (not in the CRM yet)</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
                {l.company ? ` · ${l.company}` : ''} ({l.email})
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Guest name</Label>
          <Input id="name" required value={guestName} onChange={(e) => setGuestName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Guest email</Label>
          <Input id="email" type="email" required value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Meeting title</Label>
          <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Note to guest (optional)</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {teammates.length > 0 ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Add teammates to the call (optional)</legend>
            <p className="text-xs text-muted-foreground">
              {teammatesAreAdminsOnly ? 'You can add admins.' : 'Anyone on the team.'} They get the Meet link by email and can join the moment it starts, with nothing to approve.
            </p>
            <Select
              aria-label="Add a teammate"
              value=""
              onChange={(e) => {
                const id = e.target.value
                if (id) setTeammateIds((ids) => (ids.includes(id) ? ids : [...ids, id]))
              }}
            >
              <option value="">{teammateIds.length > 0 ? 'Add another teammate…' : 'Select a teammate…'}</option>
              {teammates
                .filter((t) => t.id !== hostId && !teammateIds.includes(t.id))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
            </Select>
            {teammateIds.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {teammateIds.map((id) => (
                  <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-sm">
                    {teammates.find((t) => t.id === id)?.label ?? id}
                    <button type="button" aria-label="Remove teammate" className="text-muted-foreground hover:text-foreground" onClick={() => setTeammateIds((ids) => ids.filter((x) => x !== id))}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </fieldset>
        ) : null}
      </div>
      <div className="space-y-4">
        {hosts.length > 1 ? (
          <div className="space-y-2">
            <Label htmlFor="host">Host (whose calendar)</Label>
            <Select id="host" value={hostId} onChange={(e) => setHostId(e.target.value)}>
              {hosts.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.label}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-2 sm:col-span-1">
            <Label htmlFor="when">Date and time</Label>
            <Input id="when" type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-2 sm:col-span-1">
            <Label htmlFor="duration">Length</Label>
            <Select id="duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {[...new Set([15, 30, 45, 60, 90, defaultDuration])].sort((a, b) => a - b).map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </Select>
          </div>
        </div>
        {note ? <p className="text-xs text-amber-300">{note}</p> : startIso && !checking ? <p className="text-xs text-muted-foreground">✓ You are free at this time.</p> : null}
        <Button type="submit" className="w-full" disabled={sending || !startIso || checking || Boolean(note)}>
          {sending ? 'Sending…' : startIso ? 'Send invite' : 'Choose a time to continue'}
        </Button>
        {message ? <p className={message.kind === 'ok' ? 'text-sm text-green-400' : 'text-sm text-red-400'}>{message.text}</p> : null}
      </div>
    </form>
  )
}
