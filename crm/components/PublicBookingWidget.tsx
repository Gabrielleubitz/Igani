'use client'

import { useEffect, useState, useTransition } from 'react'
import { createPublicBooking, getPublicSlots } from '@/app/actions/bookings'
import { SlotPicker, todayIso } from '@/components/SlotPicker'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'

type Done = { status: 'CONFIRMED' | 'PENDING'; meetUrl: string | null }

export function PublicBookingWidget({ slug, requiresApproval }: { slug: string; requiresApproval: boolean }): React.ReactElement {
  const [date, setDate] = useState(todayIso())
  const [slots, setSlots] = useState<string[]>([])
  const [slot, setSlot] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [trap, setTrap] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<Done | null>(null)
  const [loading, startLoad] = useTransition()
  const [sending, startSend] = useTransition()

  useEffect(() => {
    setSlot(null)
    startLoad(async () => {
      const res = await getPublicSlots(slug, date)
      setSlots(res.ok ? res.data : [])
      setError(res.ok ? null : res.error)
    })
  }, [slug, date])

  if (done) {
    return done.status === 'CONFIRMED' ? (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">You&apos;re booked!</h2>
        <p className="text-sm text-muted-foreground">A confirmation with a calendar file is on its way to {email}.</p>
        {done.meetUrl ? (
          <Button asChild>
            <a href={done.meetUrl}>Join Google Meet</a>
          </Button>
        ) : null}
      </div>
    ) : (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Request received</h2>
        <p className="text-sm text-muted-foreground">We&apos;ll confirm by email to {email} shortly.</p>
      </div>
    )
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!slot) return setError('Pick a time first.')
        startSend(async () => {
          const res = await createPublicBooking({ slug, name, email, startTime: slot, notes: notes || undefined, company_website: trap || undefined })
          if (res.ok) setDone(res.data)
          else setError(res.error)
        })
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" min={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading times…</p> : <SlotPicker slots={slots} selected={slot} onSelect={setSlot} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">What would you like to discuss? (optional)</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <input type="text" name="company_website" tabIndex={-1} autoComplete="off" className="hidden" value={trap} onChange={(e) => setTrap(e.target.value)} aria-hidden />
      <Button type="submit" className="w-full" disabled={sending || !slot}>
        {sending ? 'Booking…' : requiresApproval ? 'Request this time' : 'Book this time'}
      </Button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </form>
  )
}
