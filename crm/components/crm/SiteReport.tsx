'use client'

import { AlertTriangle, Check, Copy, Info, Loader2, Search, ShieldAlert, Wallet } from 'lucide-react'
import { useState, useTransition } from 'react'
import { checkSite } from '@/app/actions/site-audit'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import type { Finding, Group, SiteReport } from '@/lib/site-audit-core'
import { cn } from '@/lib/utils'

const GROUPS: { id: Group; label: string; icon: typeof ShieldAlert }[] = [
  { id: 'security', label: 'Security (WordPress, PHP, signs of a hack)', icon: ShieldAlert },
  { id: 'cost', label: 'Costly set-ups', icon: Wallet },
  { id: 'basics', label: 'Basics (speed, phones, contact)', icon: Info },
  { id: 'more', label: 'More to raise (read from the page by AI)', icon: Info },
]
const TONE: Record<Finding['level'], string> = {
  high: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  medium: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  low: 'border-border bg-muted/30 text-muted-foreground',
  good: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
}
const WORD: Record<Finding['level'], string> = { high: 'Serious', medium: 'Worth raising', low: 'Minor', good: 'Fine' }

/** The result of a site check: what the site runs on, what is wrong in plain words, and a sentence to open the call with. */
export function SiteReportView({ report }: { report: SiteReport }): React.ReactElement {
  const [copied, setCopied] = useState(false)
  const problems = report.findings.filter((f) => f.level === 'high' || f.level === 'medium').length
  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-medium">{report.url}</span>
          <span className="ms-2 text-muted-foreground">
            runs on {report.platform.name}
            {report.platform.version ? ` ${report.platform.version}` : ''}
          </span>
        </div>
        <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-medium', problems ? TONE.high : TONE.good)}>{problems ? `${problems} problem${problems === 1 ? '' : 's'} to raise` : 'Nothing serious found'}</span>
      </div>
      {report.opener ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">Open the call with</div>
          <p className="mt-1">“{report.opener}”</p>
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-300 hover:underline"
            onClick={() => {
              void navigator.clipboard?.writeText(report.opener ?? '').then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              })
            }}
          >
            {copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      ) : null}
      {GROUPS.map((g) => {
        const items = report.findings.filter((f) => f.group === g.id)
        if (!items.length) return null
        return (
          <div key={g.id} className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <g.icon className="h-3.5 w-3.5" aria-hidden /> {g.label}
            </div>
            {items.map((f) => (
              <div key={f.id} className={cn('rounded-lg border p-2.5', TONE[f.level])}>
                <div className="flex flex-wrap items-center gap-2">
                  {f.level === 'high' ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> : null}
                  <span className="font-medium text-foreground">{f.title}</span>
                  <span className="text-[11px] opacity-80">{WORD[f.level]}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{f.detail}</p>
                {f.say ? <p className="mt-1 text-xs text-foreground/90">Say: “{f.say}”</p> : null}
              </div>
            ))}
          </div>
        )
      })}
      <p className="text-xs text-muted-foreground">Based on what any visitor’s browser can see.{report.ai ? ' The last group is written by AI from the page text, and each point quotes the page.' : ''} It points to things worth checking; it is not a full security test.</p>
    </div>
  )
}

/** Runs the check for one address and shows the result. */
export function useSiteCheck(): { run: (url: string) => void; pending: boolean; report: SiteReport | null; error: string | null; reset: () => void } {
  const [report, setReport] = useState<SiteReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return {
    pending,
    report,
    error,
    reset: () => {
      setReport(null)
      setError(null)
    },
    run: (url) => {
      setError(null)
      setReport(null)
      start(async () => {
        const r = await checkSite({ url })
        if (r.ok) setReport(r.data)
        else setError(r.error)
      })
    },
  }
}

/** "See what's wrong with a specific site": type any address. */
export function CheckSiteButton(): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const c = useSiteCheck()
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <ShieldAlert className="me-1.5 h-4 w-4" aria-hidden /> Check a site
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="See what’s wrong with a specific site"
        description="Type a website address. We read it the way a visitor would and list what to raise on the call: an out-of-date WordPress or PHP, signs of a hack, costly monthly plans and paid add-ons, and the basics."
        className="w-[min(96vw,46rem)]"
      >
        <form
          className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault()
            if (url.trim().length >= 3) c.run(url)
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="cs-url">Website address</Label>
            <Input id="cs-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="e.g. example.co.il" dir="ltr" autoFocus maxLength={300} />
          </div>
          <Button type="submit" disabled={c.pending || url.trim().length < 3}>
            {c.pending ? <Loader2 className="me-1.5 h-4 w-4 animate-spin" /> : <Search className="me-1.5 h-4 w-4" />} Check
          </Button>
        </form>
        {c.pending ? <p className="text-sm text-muted-foreground">Reading the site…</p> : null}
        {c.error ? <p className="text-sm text-rose-400">{c.error}</p> : null}
        {c.report ? <SiteReportView report={c.report} /> : null}
      </Dialog>
    </>
  )
}
