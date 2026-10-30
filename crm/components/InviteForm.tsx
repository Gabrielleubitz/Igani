'use client'

import { useEffect, useState, useTransition } from 'react'
import { createSalesInvite, getHostSlots } from '@/app/actions/bookings'
import { SlotPicker, todayIso } from '@/components/SlotPicker'
import { Button } from '@/components/ui/button'
import { Input, Label, Select, Textarea } from '@/components/ui/input'

interface LeadOption {
  id: string
  name: string
  email: string
}

export function InviteForm({ leads, initialLeadId }: { leads: LeadOption[]; initialLeadId?: string }): React.ReactElement {
  const initial = leads.find((l) => l.id === initialLeadId)
  const [leadId, setLeadId] = useState(initial?.id ?? '')
  const [guestName, setGuestName] = useState(initial?.name ?? '')
  const [guestEmail, setGuestEmail] = useState(initial?.email ?? '')
  const [title, setTitle] = useState('Igani intro call')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(todayIso())
  const [duration, setDuration] = useState(30)
  const [slots, setSlots] = useState<string[]>([])
  const [slot, setSlot] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [loadingSlots, startSlots] = useTransition()
  const [sending, startSend] = useTransition()

  useEffect(() => {
    setSlot(null)
    startSlots(async () => {
      const res = await getHostSlots({ date, durationMinutes: duration })
      if (res.ok) setSlots(res.data)
      else {
        setSlots([])
        setMessage({ kind: 'error', text: res.error })
      }
    })
  }, [date, duration])

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
    if (!slot) return setMessage({ kind: 'error', text: 'Pick a time first.' })
    startSend(async () => {
      const res = await createSalesInvite({
        leadId: leadId || undefined,
        guestName,
        guestEmail,
        title,
        notes: notes || undefined,
        startTime: slot,
        durationMinutes: duration,
      })
      if (res.ok) {
        setMessage({ kind: 'ok', text: `Invite sent to ${guestEmail}. The slot is held until they confirm.` })
        setSlots((s) => s.filter((x) => x !== slot))
        setSlot(null)
      } else setMessage({ kind: 'error', text: res.error })
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="lead">Lead</Label>
          <Select id="lead" value={leadId} onChange={(e) => pickLead(e.target.value)}>
            <option value="">— New contact —</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.email})
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
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" min={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Length</Label>
            <Select id="duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {[15, 30, 45, 60, 90].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </Select>
          </div>
        </div>
        {loadingSlots ? <p className="text-sm text-muted-foreground">Checking your calendar…</p> : <SlotPicker slots={slots} selected={slot} onSelect={setSlot} />}
        <Button type="submit" className="w-full" disabled={sending || !slot}>
          {sending ? 'Sending…' : 'Send invite'}
        </Button>
        {message ? <p className={message.kind === 'ok' ? 'text-sm text-green-400' : 'text-sm text-red-400'}>{message.text}</p> : null}
      </div>
    </form>
  )
}
