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

/** Hebrew starter templates (same ids as English). */
const TEMPLATES_HE: Record<string, Pick<Template, 'subject' | 'body'>> = {
  blank: { subject: '', body: 'שלום {first},\n\n' },
  intro: { subject: 'תודה שפנית ל-Igani', body: 'שלום {first},\n\nתודה שיצרת קשר עם Igani! אשמח להכיר את {company} ולשמוע מה אתם מחפשים לבנות.\n\nמתאים לך שיחה קצרה של 20 דקות השבוע? אפשר לבחור זמן נוח, או להשיב עם כמה אפשרויות.\n\nמדברים בקרוב,\n{me}' },
  'follow-up': { subject: 'מעקב', body: 'שלום {first},\n\nרציתי לוודא שההודעה הקודמת לא נטמנה. האם עדיין רלוונטי להתקדם? אשמח לענות על שאלות או לקבוע שיחה קצרה.\n\nבברכה,\n{me}' },
  proposal: { subject: 'ההצעה שלך מ-Igani', body: 'שלום {first},\n\nכפי שהבטחתי, מצורפת ההצעה עבור {company}. היא כוללת היקף, לוחות זמנים ותמחור.\n\nאשמח לעבור עליה יחד, בכל זמן שנוח לך.\n\nבברכה,\n{me}' },
  thanks: { subject: 'היה נעים לדבר איתך', body: 'שלום {first},\n\nתודה שהקדשת מזמנך לשיחה. כפי שסיכמנו, הצעדים הבאים הם:\n\n• \n• \n\nאהיה בקשר בקרוב. בינתיים אפשר להשיב להודעה זו עם כל שאלה.\n\nבברכה,\n{me}' },
  won: { subject: 'ברוכים הבאים ל-Igani 🎉', body: 'שלום {first},\n\nאנחנו שמחים מאוד לעבוד עם {company}! בימים הקרובים נעדכן אתכם לגבי תחילת העבודה והאבני דרך הראשונות.\n\nאם משהו עולה בינתיים, פשוט השיבו להודעה זו.\n\nברוכים הבאים,\n{me}' },
}

export function EmailComposer({
  leadId,
  email,
  firstName,
  company,
  senderName,
  bookingUrl,
  reply,
}: {
  leadId: string
  email: string
  firstName: string | null
  company: string | null
  senderName: string
  bookingUrl?: string | null
  /** Reply to an email in the conversation: subject gets "Re:", the original is quoted and threaded */
  reply?: { id: string; subject: string }
}): React.ReactElement {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [withBooking, setWithBooking] = useState(false)
  const [lang, setLang] = useState<'en' | 'he'>('en')
  const [tpl, setTpl] = useState('blank')
  /** "If no reply, remind me in N days" (0 = don't) */
  const [followUpDays, setFollowUpDays] = useState(3)
  const he = lang === 'he'

  const fill = (s: string): string => s.replaceAll('{first}', firstName || 'there').replaceAll('{company}', company || 'your team').replaceAll('{me}', senderName.split(' ')[0] ?? senderName)
  const build = (id: string, l: 'en' | 'he'): { subject: string; body: string; withBooking: boolean } => {
    const base = TEMPLATES.find((x) => x.id === id) ?? TEMPLATES[0]!
    const t = l === 'he' ? { ...base, ...(TEMPLATES_HE[base.id] ?? {}) } : base
    if (reply && id === 'blank') {
      return { subject: /^re:/i.test(reply.subject) ? reply.subject : `Re: ${reply.subject}`, body: fill(t.body), withBooking: false }
    }
    return { subject: fill(t.subject), body: fill(t.body), withBooking: Boolean(bookingUrl) && (id === 'intro' || id === 'follow-up') }
  }
  const apply = (id: string, l: 'en' | 'he' = lang): void => {
    setTpl(id)
    const t = build(id, l)
    setSubject(t.subject)
    setBody(t.body)
    setWithBooking(t.withBooking)
  }
  /** Switch language; swap the template text only if the user has not edited it, never overwrite typed text. */
  const switchLang = (l: 'en' | 'he'): void => {
    if (l === lang) return
    const old = build(tpl, lang)
    const untouched = subject === old.subject && body === old.body
    setLang(l)
    if (untouched) {
      const t = build(tpl, l)
      setSubject(t.subject)
      setBody(t.body)
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant={reply ? 'outline' : 'default'}
        className={reply ? 'h-7 px-2 text-xs' : undefined}
        onClick={() => {
          setLang('en')
          apply('blank', 'en')
          setError(null)
          setSent(null)
          setOpen(true)
        }}
      >
        {reply ? '↩ Reply' : '✉️ Email'}
      </Button>
      {sent ? <span className="text-xs text-emerald-400">{sent}</span> : null}
      <Dialog open={open} onClose={() => setOpen(false)} title={reply ? `Reply to ${firstName || email}` : `Email ${firstName || email}`} description={`Sent in the Igani branded template${reply ? ', with their message quoted and threaded' : ''}. Replies go to your inbox and appear here. To: ${email}`} className="w-[min(94vw,40rem)]">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              const res = await emailContact(leadId, { subject, body, cta: withBooking && bookingUrl ? { label: he ? 'בחר/י זמן לשיחה' : 'Pick a time to talk', href: bookingUrl } : undefined, lang, replyToId: reply?.id, followUpDays })
              if (res.ok) {
                setOpen(false)
                setSent(`Email sent to ${email}.${followUpDays ? ` Reminder in ${followUpDays} days if they don’t reply.` : ''}`)
                router.refresh()
              } else setError(res.error)
            })
          }}
        >
          <div className="flex items-center gap-2" role="group" aria-label="Email language">
            <span className="text-sm font-medium">Email language</span>
            {(['en', 'he'] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={lang === l}
                onClick={() => switchLang(l)}
                className={`rounded-full border px-3 py-1 text-sm ${lang === l ? 'border-primary/50 bg-primary/15 font-medium' : 'text-muted-foreground hover:bg-muted'}`}
              >
                {l === 'en' ? 'English' : 'עברית'}
              </button>
            ))}
            <span className="text-xs text-muted-foreground">{he ? 'Sent right-to-left in Hebrew' : ''}</span>
          </div>
          <div className="space-y-1">
            <Label htmlFor="tpl">Start from</Label>
            <Select id="tpl" value={tpl} onChange={(e) => apply(e.target.value)}>
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="subj">Subject</Label>
            <Input id="subj" dir={he ? 'rtl' : 'ltr'} required maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="body">Message</Label>
            <Textarea id="body" dir={he ? 'rtl' : 'ltr'} required rows={10} maxLength={10000} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          {bookingUrl ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={withBooking} onChange={(e) => setWithBooking(e.target.checked)} />
              Add a &ldquo;Pick a time to talk&rdquo; button (links to your booking page)
            </label>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Label htmlFor="followup">If they don’t reply, remind me in</Label>
            <Select id="followup" value={followUpDays} onChange={(e) => setFollowUpDays(Number(e.target.value))} className="h-9 w-auto">
              <option value={2}>2 days</option>
              <option value={3}>3 days</option>
              <option value={5}>5 days</option>
              <option value={7}>a week</option>
              <option value={0}>Don’t remind me</option>
            </Select>
            <span className="basis-full text-xs text-muted-foreground">A follow-up task on this contact. It closes by itself when their reply reaches your Gmail.</span>
          </div>
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
