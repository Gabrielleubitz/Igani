'use client'

import { Briefcase, Building2, CalendarCheck, CalendarPlus, Check, CheckCircle2, Globe, ListTodo, Loader2, MapPin, Quote, RefreshCw, Sparkles, Target, UserRound, Wallet, X } from 'lucide-react'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { addProfileMeetingToCalendar, profileItemToTask, rebuildLeadProfile, setProfileItem } from '@/app/actions/lead-intel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LeadProfile, ProfileItem } from '@/lib/lead-intel'
import { cn } from '@/lib/utils'

const fmtWhen = (local: string, tz: string): string => {
  // "YYYY-MM-DDTHH:mm" in the rep's zone → a friendly line in that zone
  const [d, t] = local.split('T')
  const day = new Date(`${d}T12:00:00Z`)
  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(day)
  return `${weekday} at ${t}${tz !== Intl.DateTimeFormat().resolvedOptions().timeZone ? ` (${tz.split('/').pop()?.replace(/_/g, ' ')})` : ''}`
}
const fmtDue = (due: string | null): string | null => {
  if (!due) return null
  const d = new Date(`${due.slice(0, 10)}T12:00:00Z`)
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d)
  return due.length > 10 ? `${day}, ${due.slice(11)}` : day
}

function Row({ icon: Icon, label, value, href, sub }: { icon: typeof Globe; label: string; value: string; href?: string; sub?: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="break-words font-medium text-primary underline-offset-2 hover:underline">
            {value}
          </a>
        ) : (
          <div className="break-words font-medium">{value}</div>
        )}
        {sub}
      </div>
    </div>
  )
}

/** The AI-built profile: who they are, their business and site, what they need, a booked time, and next steps. */
export function LeadProfileCard({ leadId, profile, reviewedCalls, callDates }: { leadId: string; profile: LeadProfile | null; reviewedCalls: number; callDates: Record<string, string> }): React.ReactElement | null {
  const [p, setP] = useState(profile)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [, start] = useTransition()

  const run = (key: string, fn: () => Promise<{ ok: boolean; error?: string }>, after?: (np: LeadProfile) => LeadProfile): void => {
    setBusy(key)
    setMsg(null)
    start(async () => {
      const r = await fn()
      setBusy(null)
      if (!r.ok) setMsg(r.error ?? 'Something went wrong.')
      else if (after && p) setP(after(structuredClone(p)))
    })
  }

  if (!p) {
    if (!reviewedCalls) return null
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-between gap-3 py-4 text-sm">
          <span className="text-muted-foreground">
            <Sparkles className="mr-1.5 inline h-4 w-4 text-violet-400" />
            Build a profile from {reviewedCalls === 1 ? 'the reviewed call' : `${reviewedCalls} reviewed calls`}.
          </span>
          <button type="button" disabled={busy !== null} onClick={() => run('rebuild', async () => { const r = await rebuildLeadProfile(leadId); if (r.ok) location.reload(); return r })} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
            {busy === 'rebuild' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Build profile
          </button>
        </CardContent>
      </Card>
    )
  }

  const f = p.fields
  const open = p.actionItems.filter((i) => i.status === 'open')
  const doneish = p.actionItems.filter((i) => i.status !== 'open')
  const upcoming = [...p.meetings].sort((a, b) => a.when.localeCompare(b.when))
  const source = (callId: string): React.ReactNode => (callDates[callId] ? <Link href={`/sales/calls/${callId}`} className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">from the call on {callDates[callId]}</Link> : null)
  const site = p.siteCheck
  const platform = site && site.platform !== 'Unreachable' ? `${site.platform}${site.version ? ` ${site.version}` : ''}` : f.platform?.value
  const setItem = (it: ProfileItem, status: ProfileItem['status']) => (np: LeadProfile) => ({ ...np, actionItems: np.actionItems.map((x) => (x.id === it.id ? { ...x, status } : x)) })

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-0 border-b bg-gradient-to-br from-violet-500/[0.07] to-transparent pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-1.5 text-base">
              <Sparkles className="h-4 w-4 text-violet-400" /> What we know
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Built by AI from {p.calls.length === 1 ? '1 call' : `${p.calls.length} calls`}. Only what was said.
            </p>
          </div>
          <button type="button" title="Read the calls again" aria-label="Rebuild the profile from the calls" disabled={busy !== null} onClick={() => run('rebuild', async () => { const r = await rebuildLeadProfile(leadId); if (r.ok) location.reload(); return r })} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <RefreshCw className={cn('h-4 w-4', busy === 'rebuild' && 'animate-spin')} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-4 text-sm">
        {/* booked time */}
        {upcoming.map((m) => (
          <div key={m.id} className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <CalendarCheck className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400">Booked on the call</div>
                <div className="font-semibold">{fmtWhen(m.when, m.timeZone)}</div>
                <div className="text-xs text-muted-foreground">
                  {m.kind === 'video' ? 'Video call' : m.kind === 'in_person' ? 'In person' : m.kind === 'phone' ? 'Phone call' : 'Meeting'} · {m.durationMin} min{m.topic ? ` · ${m.topic}` : ''}
                </div>
                {m.quote ? <div className="mt-1 text-xs italic text-muted-foreground">“{m.quote}”</div> : null}
              </div>
            </div>
            <div className="mt-3">
              {m.entryId ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> On your calendar
                </span>
              ) : (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    run(`cal-${m.id}`, async () => {
                      const r = await addProfileMeetingToCalendar(leadId, m.id)
                      if (r.ok) setMsg(r.data.googleSynced ? 'Added to your calendar and Google Calendar.' : 'Added to your calendar (Today page).')
                      return r
                    }, (np) => ({ ...np, meetings: np.meetings.map((x) => (x.id === m.id ? { ...x, entryId: 'added' } : x)) }))
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
                >
                  {busy === `cal-${m.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarPlus className="h-3.5 w-3.5" />} Add to calendar
                </button>
              )}
            </div>
          </div>
        ))}

        {/* next steps */}
        {p.actionItems.length ? (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <ListTodo className="h-3.5 w-3.5" /> Next steps
            </div>
            <ul className="space-y-1.5">
              {open.map((it) => (
                <li key={it.id} className="group flex items-start gap-2 rounded-lg border bg-card/60 px-2.5 py-2">
                  <button type="button" aria-label="Mark done" title="Done" disabled={busy !== null} onClick={() => run(`done-${it.id}`, () => setProfileItem(leadId, it.id, 'done'), setItem(it, 'done'))} className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground/50 hover:border-emerald-400 hover:bg-emerald-400/20" />
                  <div className="min-w-0 flex-1">
                    <div className="leading-snug">{it.text}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                      <span className={it.owner === 'client' ? 'text-amber-400' : 'text-sky-400'}>{it.owner === 'client' ? 'Client' : 'Us'}</span>
                      {fmtDue(it.due) ? <span>· due {fmtDue(it.due)}</span> : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" disabled={busy !== null} onClick={() => run(`task-${it.id}`, () => profileItemToTask(leadId, it.id), setItem(it, 'tasked'))} className="rounded-md border px-2 py-1 text-[11px] font-semibold hover:bg-muted">
                      {busy === `task-${it.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Make task'}
                    </button>
                    <button type="button" aria-label="Dismiss" title="Not needed" disabled={busy !== null} onClick={() => run(`x-${it.id}`, () => setProfileItem(leadId, it.id, 'dismissed'), setItem(it, 'dismissed'))} className="rounded-md p-1 text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
              {doneish.slice(-4).map((it) => (
                <li key={it.id} className="flex items-center gap-2 px-2.5 py-1 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className={cn('flex-1', it.status !== 'tasked' && 'line-through')}>{it.text}</span>
                  <span>{it.status === 'tasked' ? 'Task made' : it.status === 'done' ? 'Done' : 'Dismissed'}</span>
                  {it.status !== 'tasked' ? (
                    <button type="button" className="underline-offset-2 hover:underline" onClick={() => run(`undo-${it.id}`, () => setProfileItem(leadId, it.id, 'open'), setItem(it, 'open'))}>
                      Undo
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* who and what */}
        <div className="grid gap-3">
          {f.name ? <Row icon={UserRound} label="Name" value={f.name.value + (f.role ? ` · ${f.role.value}` : '')} sub={source(f.name.callId)} /> : f.role ? <Row icon={UserRound} label="Role" value={f.role.value} /> : null}
          {f.company ? <Row icon={Building2} label="Company" value={[f.company.value, f.industry?.value].filter(Boolean).join(' · ')} sub={f.size ? <span className="text-xs text-muted-foreground">{f.size.value}</span> : null} /> : null}
          {f.location ? <Row icon={MapPin} label="Location" value={f.location.value} /> : null}
          {f.website || site ? (
            <Row
              icon={Globe}
              label="Website"
              value={(site?.url ?? f.website?.value ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '')}
              href={site?.url ?? f.website?.value}
              sub={
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {platform ? <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', site?.kind === 'wordpress' || /wordpress/i.test(platform) ? 'bg-sky-500/15 text-sky-300' : 'bg-muted text-foreground')}>{platform}</span> : null}
                  {site?.opener ? <span className="text-xs text-muted-foreground">{site.opener}</span> : null}
                  {f.siteNotes ? <span className="text-xs text-muted-foreground">“{f.siteNotes.value}”</span> : null}
                </div>
              }
            />
          ) : null}
          {f.email ? <Row icon={Briefcase} label="Email (said on the call)" value={f.email.value} href={`mailto:${f.email.value}`} /> : null}
          {f.budget || f.timeline ? <Row icon={Wallet} label="Budget · timeline" value={[f.budget?.value, f.timeline?.value].filter(Boolean).join(' · ')} /> : null}
          {f.decisionMaker ? <Row icon={Target} label="Who decides" value={f.decisionMaker.value} /> : null}
        </div>

        {p.lists.needs.length || p.lists.pains.length ? (
          <div className="space-y-2">
            {p.lists.needs.length ? (
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Wants</div>
                <div className="flex flex-wrap gap-1.5">
                  {p.lists.needs.map((n) => (
                    <span key={n.value} className="rounded-full bg-violet-500/15 px-2.5 py-1 text-xs text-violet-200">
                      {n.value}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {p.lists.pains.length ? (
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Pains</div>
                <div className="flex flex-wrap gap-1.5">
                  {p.lists.pains.map((n) => (
                    <span key={n.value} className="rounded-full bg-rose-500/15 px-2.5 py-1 text-xs text-rose-200">
                      {n.value}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {p.lists.competitors.length ? (
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Also talking to:</span> {p.lists.competitors.map((c) => c.value).join(', ')}
          </div>
        ) : null}

        {p.facts.length ? (
          <div>
            <div className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">Good to remember</div>
            <ul className="space-y-1.5">
              {p.facts.slice(-8).map((x, i) => (
                <li key={i} className="flex gap-2 text-xs">
                  <Quote className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                  <span>
                    <b>{x.label}:</b> {x.value}
                    {x.quote ? <span className="text-muted-foreground"> · “{x.quote}”</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {msg ? (
          <p role="status" className="text-xs text-muted-foreground">
            {msg}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
