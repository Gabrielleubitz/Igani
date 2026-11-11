'use client'

import { Loader2, Mail, MessageSquare, Send, Sparkles, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { dismissFollowUp, sendFollowUp } from '@/app/actions/follow-ups'
import { hebrewShare } from '@/lib/call-language'
import { cn } from '@/lib/utils'

export interface FollowUpDraftView {
  id: string
  leadId: string
  leadName: string
  channel: string
  subject: string | null
  body: string
  reason: string
  kind: string
}

/** Today → "Follow-ups ready": drafts from the follow-up assistant, edited and sent here (or dismissed). */
export function FollowUpDrafts({ drafts }: { drafts: FollowUpDraftView[] }): React.ReactElement | null {
  if (!drafts.length) return null
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-b from-violet-500/[0.08] to-card/60">
      <div className="flex items-start gap-3 px-5 pb-3 pt-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/25">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold tracking-tight">Follow-ups ready</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Conversations that went quiet with something still open. Drafted in your style: check, edit, send.</p>
        </div>
      </div>
      <ul className="divide-y divide-border/60 border-t border-border/60">
        {drafts.map((d) => (
          <DraftRow key={d.id} d={d} />
        ))}
      </ul>
    </section>
  )
}

function DraftRow({ d }: { d: FollowUpDraftView }): React.ReactElement {
  const router = useRouter()
  const [subject, setSubject] = useState(d.subject ?? '')
  const [body, setBody] = useState(d.body)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<'sent' | 'dismissed' | null>(null)
  const [pending, start] = useTransition()
  const email = d.channel === 'email'
  const rtl = (hebrewShare(body) ?? 0) >= 0.4

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, result: 'sent' | 'dismissed'): void => {
    setError(null)
    start(async () => {
      const r = await fn()
      if (r.ok) {
        setDone(result)
        router.refresh()
      } else setError(r.error ?? 'Something went wrong.')
    })
  }

  if (done) {
    return <li className="px-5 py-3 text-sm text-muted-foreground">{done === 'sent' ? `✓ Sent to ${d.leadName}.` : `Dismissed the follow-up for ${d.leadName}.`}</li>
  }

  return (
    <li className="space-y-2 px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/sales/leads/${d.leadId}`} className="font-medium hover:underline">
            {d.leadName}
          </Link>
          <p className="text-xs text-muted-foreground">{d.reason}</p>
        </div>
        <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1', email ? 'bg-sky-500/15 text-sky-300 ring-sky-500/25' : 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/25')}>
          {email ? <Mail className="h-3 w-3" aria-hidden /> : <MessageSquare className="h-3 w-3" aria-hidden />}
          {email ? 'Email' : 'Text'}
        </span>
      </div>

      {open ? (
        <div className="space-y-2">
          {email ? <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-lg border bg-background/60 px-3 py-1.5 text-sm" placeholder="Subject" aria-label="Subject" /> : null}
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={email ? 7 : 4} dir={rtl ? 'rtl' : 'ltr'} className="w-full rounded-lg border bg-background/60 px-3 py-2 text-sm leading-relaxed" aria-label="Message" />
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="block w-full rounded-lg border border-dashed bg-background/30 px-3 py-2 text-start text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground" dir={rtl ? 'rtl' : 'ltr'}>
          {email && subject ? <span className="block font-medium text-foreground">{subject}</span> : null}
          <span className="line-clamp-2">{body}</span>
        </button>
      )}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending || !body.trim()}
          onClick={() => act(() => sendFollowUp(d.id, { subject: email ? subject : undefined, body }), 'sent')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} {open ? 'Send' : `Send ${email ? 'email' : 'text'}`}
        </button>
        {!open ? (
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg border bg-background/40 px-2.5 py-1.5 text-xs font-medium transition hover:border-primary/50">
            Edit first
          </button>
        ) : null}
        <button type="button" disabled={pending} onClick={() => act(() => dismissFollowUp(d.id), 'dismissed')} className="ms-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-60">
          <X className="h-3.5 w-3.5" /> Not needed
        </button>
      </div>
    </li>
  )
}
