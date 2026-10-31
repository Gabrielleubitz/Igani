'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { markEmailsRead, syncMyEmail } from '@/app/sales/actions'
import { EmailComposer } from '@/components/crm/EmailComposer'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface EmailView {
  id: string
  direction: 'INBOUND' | 'OUTBOUND'
  fromLabel: string
  toLabel: string
  subject: string
  snippet: string
  body: string
  when: string
  ago: string
  unread: boolean
  via: 'gmail' | 'crm'
}

/** The contact's email conversation (from teammates' Gmail + emails sent from the CRM), newest first. */
export function EmailsPanel({
  leadId,
  emails,
  gmailConnected,
  canMarkRead,
  composer,
}: {
  leadId: string
  emails: EmailView[]
  gmailConnected: boolean
  canMarkRead: boolean
  /** Props for reply composers (null when the contact has no email address) */
  composer: { email: string; firstName: string | null; company: string | null; senderName: string } | null
}): React.ReactElement {
  const router = useRouter()
  const [open, setOpen] = useState<string | null>(emails.find((e) => e.unread)?.id ?? null)
  const [pending, start] = useTransition()
  const [note, setNote] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  // Pull new mail quietly when the contact opens, and mark their emails read for the owner.
  useEffect(() => {
    let alive = true
    void syncMyEmail().then((r) => {
      if (alive && r.ok && r.data.stored > 0) router.refresh()
    })
    if (canMarkRead && emails.some((e) => e.unread)) void markEmailsRead(leadId)
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId])

  const check = (): void =>
    start(async () => {
      const r = await syncMyEmail(true)
      if (!r.ok) return setNote(r.error)
      setNote(r.data.connected ? (r.data.stored ? `✓ ${r.data.stored} new email${r.data.stored === 1 ? '' : 's'} found.` : '✓ Up to date.') : 'Connect Gmail first.')
      router.refresh()
    })

  const list = showAll ? emails : emails.slice(0, 8)
  return (
    <div className="space-y-3">
      {!gmailConnected ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm">
          <span>Connect your Gmail so replies and emails with this contact show up here automatically.</span>
          <Button size="sm" onClick={() => void signIn('google', { callbackUrl: window.location.pathname })}>
            Connect Gmail
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Synced from your Gmail{note ? ` · ${note}` : ''}</span>
          <button type="button" onClick={check} disabled={pending} className="text-primary underline-offset-4 hover:underline disabled:opacity-60">
            {pending ? 'Checking…' : 'Check for new emails'}
          </button>
        </div>
      )}
      {emails.length === 0 ? <p className="text-sm text-muted-foreground">No emails with this contact yet.</p> : null}
      <ul className="divide-y rounded-lg border">
        {list.map((e) => {
          const isOpen = open === e.id
          return (
            <li key={e.id} className={cn(e.unread && 'bg-primary/5')}>
              <button type="button" onClick={() => setOpen(isOpen ? null : e.id)} className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-muted/30" aria-expanded={isOpen}>
                <span aria-hidden className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs', e.direction === 'INBOUND' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-primary/15 text-primary')}>
                  {e.direction === 'INBOUND' ? '↙' : '↗'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={cn('truncate text-sm', e.unread ? 'font-semibold' : 'font-medium')}>
                      {e.direction === 'INBOUND' ? e.fromLabel : `You → ${e.toLabel}`}
                      {e.unread ? <span className="ml-2 rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-foreground">NEW</span> : null}
                    </span>
                    <time className="shrink-0 text-xs text-muted-foreground" title={e.when}>
                      {e.ago}
                    </time>
                  </span>
                  <span className="block truncate text-sm">{e.subject}</span>
                  {!isOpen ? <span className="block truncate text-xs text-muted-foreground">{e.snippet}</span> : null}
                </span>
              </button>
              {isOpen ? (
                <div className="space-y-3 px-3 pb-3 pl-12">
                  <div className="text-xs text-muted-foreground">
                    {e.when} · from {e.fromLabel} to {e.toLabel} · {e.via === 'crm' ? 'sent from the CRM' : 'via Gmail'}
                  </div>
                  <p className="whitespace-pre-wrap rounded-md border bg-background/40 p-3 text-sm">{e.body || e.snippet || '(no text)'}</p>
                  {composer && e.direction === 'INBOUND' ? <EmailComposer leadId={leadId} {...composer} reply={{ id: e.id, subject: e.subject }} /> : null}
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
      {emails.length > 8 && !showAll ? (
        <button type="button" onClick={() => setShowAll(true)} className="text-sm text-primary underline-offset-4 hover:underline">
          Show all {emails.length} emails
        </button>
      ) : null}
    </div>
  )
}
