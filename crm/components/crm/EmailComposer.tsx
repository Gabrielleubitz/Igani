'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { emailContact } from '@/app/sales/actions'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input, Label, Select, Textarea } from '@/components/ui/input'

interface Template {
  id: string
  label: string
  subject: string
  body: string
  cta?: { label: string; href: string }
}

/** Starter templates; {first} and {company} are filled in from the contact, {me} from the sender. */
const TEMPLATES: Template[] = [
  { id: 'blank', label: 'Blank message', subject: '', body: 'Hi {first},\n\n' },
  {
    id: 'intro',
    label: 'First reply to a new lead',
    subject: 'Thanks for reaching out to Igani',
    body: "Hi {first},\n\nThanks for getting in touch with Igani! I'd love to learn more about {company} and what you're looking to build.\n\nWould you be up for a quick 20-minute call this week? Just pick a time that suits you, or reply with a couple of options.\n\nTalk soon,\n{me}",
  },
  {
    id: 'follow-up',
    label: 'Friendly follow-up',
    subject: 'Following up',
    body: "Hi {first},\n\nJust bubbling this up in case it got buried. Are you still interested in moving forward? Happy to answer any questions or jump on a quick call.\n\nBest,\n{me}",
  },
  {
    id: 'proposal',
    label: 'Proposal sent',
    subject: 'Your Igani proposal',
    body: "Hi {first},\n\nAs promised, here's the proposal for {company}. It covers scope, timeline and pricing.\n\nLet me know if you'd like to walk through it together, I can make time whenever suits you.\n\nBest,\n{me}",
  },
  {
    id: 'thanks',
    label: 'Thanks for the call',
    subject: 'Great speaking with you',
    body: "Hi {first},\n\nThanks for taking the time to chat today. As discussed, the next steps are:\n\n• \n• \n\nI'll be in touch shortly. In the meantime, feel free to reply with any questions.\n\nBest,\n{me}",
  },
  {
    id: 'won',
    label: 'Welcome aboard',
    subject: 'Welcome to Igani 🎉',
    body: "Hi {first},\n\nWe're thrilled to be working with {company}! Over the next couple of days you'll hear from us about kickoff and the first milestones.\n\nIf anything comes up in the meantime, just reply to this email.\n\nWelcome aboard,\n{me}",
  },
]

export function EmailComposer({ leadId, email, firstName, company, senderName, bookingUrl }: { leadId: string; email: string; firstName: string | null; company: string | null; senderName: string; bookingUrl?: string | null }): React.ReactElement {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [withBooking, setWithBooking] = useState(false)

  const fill = (s: string): string => s.replaceAll('{first}', firstName || 'there').replaceAll('{company}', company || 'your team').replaceAll('{me}', senderName.split(' ')[0] ?? senderName)
  const apply = (id: string): void => {
    const t = TEMPLATES.find((x) => x.id === id) ?? TEMPLATES[0]!
    setSubject(fill(t.subject))
    setBody(fill(t.body))
    setWithBooking(Boolean(bookingUrl) && (id === 'intro' || id === 'follow-up'))
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => {
          apply('blank')
          setError(null)
          setSent(null)
          setOpen(true)
        }}
      >
        ✉️ Email
      </Button>
      {sent ? <span className="text-xs text-emerald-400">{sent}</span> : null}
      <Dialog open={open} onClose={() => setOpen(false)} title={`Email ${firstName || email}`} description={`Sent from Igani in our branded template. Replies go to you. To: ${email}`} className="w-[min(94vw,40rem)]">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              const res = await emailContact(leadId, { subject, body, cta: withBooking && bookingUrl ? { label: 'Pick a time to talk', href: bookingUrl } : undefined })
              if (res.ok) {
                setOpen(false)
                setSent(`Email sent to ${email}.`)
                router.refresh()
              } else setError(res.error)
            })
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="tpl">Start from</Label>
            <Select id="tpl" defaultValue="blank" onChange={(e) => apply(e.target.value)}>
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="subj">Subject</Label>
            <Input id="subj" required maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="body">Message</Label>
            <Textarea id="body" required rows={10} maxLength={10000} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          {bookingUrl ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={withBooking} onChange={(e) => setWithBooking(e.target.checked)} />
              Add a &ldquo;Pick a time to talk&rdquo; button (links to your booking page)
            </label>
          ) : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !subject.trim() || !body.trim()}>
              {pending ? 'Sending…' : 'Send email'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
