'use client'

import { CheckSquare, CircleDot, FileSignature, FileText, Mail, MessageSquare, Phone, Search, StickyNote, Video, type LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { TabBar } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { filterTimeline, groupTimeline, type TimelineItem, type TimelineKind } from '@/lib/lead-timeline'
import { cn } from '@/lib/utils'

const ICON: Record<TimelineKind, LucideIcon> = { note: StickyNote, email: Mail, sms: MessageSquare, call: Phone, task: CheckSquare, meeting: Video, lead: CircleDot, document: FileText, offer: FileSignature }
const KIND_LABEL: Record<TimelineKind, string> = { note: 'Note', email: 'Email', sms: 'Text', call: 'Call', task: 'Task', meeting: 'Meeting', lead: 'Contact activity', document: 'Document', offer: 'Offer' }

type SubTab = 'all' | 'note' | 'email' | 'call' | 'task' | 'meeting'

function Card({ item, tz }: { item: TimelineItem; tz: string }): React.ReactElement {
  const [open, setOpen] = useState(false)
  const Icon = ICON[item.kind]
  const when = new Intl.DateTimeFormat('en-GB', { timeZone: tz, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(item.at))
  const long = (item.body?.length ?? 0) > 220 || (item.body?.split('\n').length ?? 0) > 3
  return (
    <li className={cn('rounded-xl border bg-card p-3.5 text-sm shadow-sm', item.group === 'overdue' && 'border-red-500/40')}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground', item.group === 'overdue' && 'bg-red-500/10 text-red-500')}>
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{KIND_LABEL[item.kind]}</div>
            <div className="break-words font-medium">{item.title}</div>
          </div>
        </div>
        <time dateTime={item.at} className={cn('shrink-0 text-xs text-muted-foreground', item.group === 'overdue' && 'font-medium text-red-500')}>
          {item.group === 'overdue' ? 'Overdue: ' : ''}
          {when}
        </time>
      </div>
      {item.body ? <p className={cn('mt-2 whitespace-pre-wrap break-words pl-[34px] text-muted-foreground', !open && long && 'line-clamp-3')}>{item.body}</p> : null}
      {item.body && long ? (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1 pl-[34px] text-xs font-medium text-primary hover:underline">
          {open ? 'Show less' : 'Show more'}
        </button>
      ) : null}
      {item.actor ? <p className="mt-1.5 pl-[34px] text-xs text-muted-foreground">{item.actor}</p> : null}
    </li>
  )
}

/** The Activities tab: sub-tabs by type, a search box, and the timeline grouped Overdue / Upcoming / by month. */
export function LeadActivities({ items, tz, emails, emailCount }: { items: TimelineItem[]; tz: string; emails: React.ReactNode; emailCount: number }): React.ReactElement {
  const [tab, setTab] = useState<SubTab>('all')
  const [q, setQ] = useState('')
  const count = (k: TimelineKind): number => items.filter((i) => i.kind === k).length
  const shown = useMemo(() => (tab === 'email' ? [] : filterTimeline(items, tab, q)), [items, tab, q])
  const sections = useMemo(() => groupTimeline(shown, tz), [shown, tz])
  return (
    <div className="space-y-4">
      <TabBar
        label="Activity type"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'all', label: 'All activities' },
          { id: 'note', label: 'Notes', count: count('note') },
          { id: 'email', label: 'Emails', count: emailCount },
          { id: 'call', label: 'Calls', count: count('call') },
          { id: 'task', label: 'Tasks', count: count('task') },
          { id: 'meeting', label: 'Meetings', count: count('meeting') },
        ]}
      />
      <div role="tabpanel" aria-labelledby={`tab-${tab}`} className="space-y-4">
        {tab === 'email' ? (
          emails
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative block w-full max-w-xs">
                <span className="sr-only">Search activities</span>
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search activities" className="h-9 pl-8" />
              </label>
              {q ? (
                <button type="button" onClick={() => setQ('')} className="text-sm font-medium text-primary hover:underline">
                  Clear
                </button>
              ) : null}
              <span className="ml-auto text-xs text-muted-foreground">{shown.length} shown</span>
            </div>
            {sections.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{q ? 'Nothing matches that search.' : 'Nothing here yet. Notes, calls, emails, tasks and meetings appear as they happen.'}</p> : null}
            {sections.map((s) => (
              <section key={s.key} aria-label={s.label} className="space-y-2">
                <h3 className={cn('text-sm font-semibold', s.key === 'overdue' && 'text-red-500')}>{s.label}</h3>
                <ul className="space-y-2">
                  {s.items.map((i) => (
                    <Card key={i.id} item={i} tz={tz} />
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
