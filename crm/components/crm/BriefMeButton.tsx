'use client'

import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { useState, useTransition } from 'react'
import { briefMe } from '@/app/actions/follow-ups'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import type { LeadBrief } from '@/lib/lead-brief'

/** "Brief me" on the contact page: everything with this contact (emails, texts, calls, meetings, notes) in a 20-second read. */
export function BriefMeButton({ leadId, name }: { leadId: string; name: string }): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [brief, setBrief] = useState<LeadBrief | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const load = (): void => {
    setError(null)
    start(async () => {
      const r = await briefMe(leadId)
      if (r.ok) setBrief(r.data)
      else setError(r.error)
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true)
          if (!brief && !pending) load()
        }}
      >
        <Sparkles className="h-4 w-4" /> Brief me
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Brief: ${name}`} description="From every email, text, call, meeting and note with this contact." className="max-w-xl">
        {pending && !brief ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading the whole history…
          </p>
        ) : error ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-destructive">{error}</p>
            <Button type="button" size="sm" variant="outline" onClick={load}>
              Try again
            </Button>
          </div>
        ) : brief ? (
          <BriefBody brief={brief} pending={pending} onRefresh={load} />
        ) : null}
      </Dialog>
    </>
  )
}

function Section({ title, items }: { title: string; items: string[] }): React.ReactElement | null {
  if (!items.length) return null
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <ul className="list-disc space-y-0.5 ps-5 text-sm">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  )
}

function BriefBody({ brief, pending, onRefresh }: { brief: LeadBrief; pending: boolean; onRefresh: () => void }): React.ReactElement {
  const rtl = brief.lang === 'he'
  return (
    <div className="space-y-4" dir={rtl ? 'rtl' : 'ltr'}>
      <p className="text-sm leading-relaxed">{brief.standing}</p>
      {brief.nextStep ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{rtl ? 'הצעד הבא' : 'Next step'}</p>
          <p className="text-sm font-medium">{brief.nextStep}</p>
        </div>
      ) : null}
      <Section title={rtl ? 'סוכם' : 'Decided'} items={brief.decided} />
      <Section title={rtl ? 'התנגדויות' : 'Objections'} items={brief.objections} />
      <Section title={rtl ? 'הבטחות פתוחות' : 'Open promises'} items={brief.openPromises.map((p) => `${p.who === 'us' ? (rtl ? 'אנחנו' : 'Us') : rtl ? 'הלקוח' : 'Client'}: ${p.text}`)} />
      <div className="flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground" dir="ltr">
        <span>
          From {brief.items} {brief.items === 1 ? 'item' : 'items'} · AI summary, check before quoting it
        </span>
        <button type="button" onClick={onRefresh} disabled={pending} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium hover:text-foreground disabled:opacity-60">
          <RefreshCw className={pending ? 'h-3 w-3 animate-spin' : 'h-3 w-3'} /> Refresh
        </button>
      </div>
    </div>
  )
}
