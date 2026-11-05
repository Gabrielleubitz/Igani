import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Eye,
  Hourglass,
  ListChecks,
  ListTodo,
  Mail,
  MailQuestion,
  PhoneCall,
  Plus,
  Send,
  Sparkles,
  UserPlus,
  Users,
  Video,
  Wallet,
} from 'lucide-react'
import Link from 'next/link'
import type { CalendarItem } from '@/components/crm/TodayCalendar'
import { MailSyncTrigger } from '@/components/crm/MailSyncTrigger'
import { MeetingSyncTrigger } from '@/components/crm/MeetingCall'
import { CalendarSection, DoneButton, StartCalling, StartsIn } from '@/components/today/TodayClient'
import { requireUser } from '@/lib/auth'
import { bookingScope } from '@/lib/bookings'
import { entryColorVar } from '@/lib/calendar-entries'
import { pushPendingEntries } from '@/lib/calendar-entry-sync'
import { formatIls } from '@/lib/commission'
import { STATUS_LABEL, formatMoney, timeAgo } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { tasksForUser } from '@/lib/tasks'
import { startOfLocalDay } from '@/lib/time'
import { loadToday, type ActionItem, type AgendaItem, type DealRow, type TodayData } from '@/lib/today'
import { cn } from '@/lib/utils'
import { WeekLineCard } from '@/components/calls/WeekLineCard'
import { lessonLinksFor, loadRepWeek } from '@/lib/straight-line-week-data'

export const metadata = { title: 'Today' }
export const dynamic = 'force-dynamic'

function greeting(tz: string): string {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(new Date()))
  return h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

/* ───────────────────────── look ───────────────────────── */

const PANEL = 'rounded-2xl border bg-card/60 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]'
const BTN = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border bg-background/40 px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/50 hover:bg-primary/10 disabled:opacity-60'

const TONE = {
  blue: 'bg-primary/15 text-[hsl(var(--accent))] ring-primary/25',
  emerald: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/25',
  amber: 'bg-amber-500/15 text-amber-300 ring-amber-500/25',
  rose: 'bg-rose-500/15 text-rose-300 ring-rose-500/25',
  violet: 'bg-violet-500/15 text-violet-300 ring-violet-500/25',
  sky: 'bg-sky-500/15 text-sky-300 ring-sky-500/25',
} as const
type Tone = keyof typeof TONE

function IconChip({ tone, children, size = 'md' }: { tone: Tone; children: React.ReactNode; size?: 'sm' | 'md' }): React.ReactElement {
  return <span className={cn('flex shrink-0 items-center justify-center rounded-xl ring-1', size === 'md' ? 'h-9 w-9' : 'h-8 w-8 rounded-lg', TONE[tone])}>{children}</span>
}

function Tag({ tone, children }: { tone: Tone; children: React.ReactNode }): React.ReactElement {
  return <span className={cn('whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1', TONE[tone])}>{children}</span>
}

function PanelHeader({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
      <div className="min-w-0">
        <h2 className="font-semibold tracking-tight">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {action}
    </div>
  )
}

function HeaderLink({ href, children }: { href: string; children: React.ReactNode }): React.ReactElement {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground">
      {children} <ArrowRight className="h-3 w-3" aria-hidden />
    </Link>
  )
}

function Sparkline({ values, className }: { values: number[]; className?: string }): React.ReactElement | null {
  if (values.every((v) => v === 0)) return null
  const max = Math.max(...values, 1)
  const w = 120
  const h = 28
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - (v / max) * (h - 6)] as const)
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn('h-7 w-[120px] overflow-visible', className)} aria-hidden>
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--warning))" stopOpacity="0.28" />
          <stop offset="100%" stopColor="hsl(var(--warning))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill="url(#spark-fill)" />
      <path d={line} fill="none" stroke="hsl(var(--warning))" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ───────────────────────── sections ───────────────────────── */

function Kpi({ href, icon, tone, label, tag, value, sub, children }: { href: string; icon: React.ReactNode; tone: Tone; label: string; tag?: React.ReactNode; value: React.ReactNode; sub: string; children?: React.ReactNode }): React.ReactElement {
  return (
    <Link href={href} className={cn(PANEL, 'group flex min-w-0 flex-col p-4 transition hover:border-primary/40 hover:bg-card sm:p-5')}>
      <div className="flex items-center gap-2.5">
        <IconChip tone={tone} size="sm">
          {icon}
        </IconChip>
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{label}</span>
        {tag ? <span className="hidden sm:inline-flex">{tag}</span> : null}
      </div>
      <div className="mt-3 text-2xl font-semibold leading-none tracking-tight tabular-nums sm:mt-4 sm:text-[28px]">{value}</div>
      {/* on a phone the tag sits under the number instead of squeezing the label */}
      {tag ? <span className="mt-2 inline-flex sm:hidden">{tag}</span> : null}
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="min-w-0 truncate text-xs text-muted-foreground">{sub}</p>
        {children ? <span className="hidden sm:block">{children}</span> : null}
      </div>
    </Link>
  )
}

function Kpis({ d }: { d: TodayData }): React.ReactElement {
  const k = d.kpis
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Kpi
        href="/sales/board"
        icon={<Briefcase className="h-4 w-4" />}
        tone="blue"
        label={d.isAdmin ? 'Open deals' : 'My open deals'}
        tag={k.newThisWeek ? <Tag tone="emerald">+{k.newThisWeek} this week</Tag> : null}
        value={k.openDeals}
        sub={[k.hot ? `${k.hot} hot` : null, k.needFollowUp ? `${k.needFollowUp} need a follow-up` : 'all touched recently'].filter(Boolean).join(' · ')}
      />
      {d.isAdmin ? (
        <Kpi
          href="/sales/reports"
          icon={<Wallet className="h-4 w-4" />}
          tone="emerald"
          label="Pipeline value"
          tag={k.wonThisMonth ? <Tag tone="emerald">{k.wonThisMonth} won this month</Tag> : null}
          value={`₪${formatMoney(k.pipelineValue)}`}
          sub={`${k.proposals} proposal${k.proposals === 1 ? '' : 's'} out or signed`}
        />
      ) : (
        <Kpi href="/sales/reports" icon={<Wallet className="h-4 w-4" />} tone="emerald" label="My commission" tag={k.wonThisMonth ? <Tag tone="emerald">{k.wonThisMonth} won this month</Tag> : null} value={formatIls(k.commissionPending)} sub="Pending: paid when the client pays" />
      )}
      <Kpi
        href="/sales/leads"
        icon={<Hourglass className="h-4 w-4" />}
        tone="amber"
        label="Waiting on replies"
        tag={k.silent ? <Tag tone="amber">{k.silent} gone quiet</Tag> : null}
        value={k.waiting}
        sub={k.waiting ? `Emails you sent · oldest ${k.oldestWaitDays}d ago` : 'Nobody owes you an answer'}
      />
      <Kpi href="/sales/tasks" icon={<ListTodo className="h-4 w-4" />} tone={k.tasksOverdue ? 'rose' : 'violet'} label="Tasks today" tag={k.tasksOverdue ? <Tag tone="rose">{k.tasksOverdue} overdue</Tag> : null} value={k.tasksToday} sub={k.tasksToday ? 'Due by tonight' : 'Nothing due. Nice.'}>
        <Sparkline values={k.doneSpark} className="shrink-0" />
      </Kpi>
    </div>
  )
}

const AGENDA_ICON: Record<AgendaItem['kind'], { icon: React.ReactNode; tone: Tone }> = {
  meeting: { icon: <Video className="h-4 w-4" />, tone: 'emerald' },
  team: { icon: <Users className="h-4 w-4" />, tone: 'violet' },
  task: { icon: <CheckCircle2 className="h-4 w-4" />, tone: 'amber' },
  'team-task': { icon: <ListTodo className="h-4 w-4" />, tone: 'amber' },
}

function YourDay({ d }: { d: TodayData }): React.ReactElement {
  const time = (t: Date): string => new Intl.DateTimeFormat('en-GB', { timeZone: d.tz, hour: '2-digit', minute: '2-digit' }).format(t)
  const now = d.now.getTime()
  // the next thing that hasn't ended yet gets the spotlight
  const next = d.agenda.find((a) => (a.minutes ? a.start.getTime() + a.minutes * 60_000 : a.start.getTime() + 30 * 60_000) > now)
  return (
    <section className={cn(PANEL, 'min-w-0')}>
      <PanelHeader title="Your day" hint={d.agenda.length ? `${d.meetingsToday} meeting${d.meetingsToday === 1 ? '' : 's'} · ${d.agenda.length - d.meetingsToday} task${d.agenda.length - d.meetingsToday === 1 ? '' : 's'}` : undefined} action={<HeaderLink href="#calendar">Calendar</HeaderLink>} />
      {d.agenda.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 pb-10 pt-6 text-center">
          <IconChip tone="blue">
            <Sparkles className="h-4 w-4" />
          </IconChip>
          <p className="text-sm font-medium">A clear day</p>
          <p className="max-w-xs text-xs text-muted-foreground">No meetings or tasks scheduled. A good day to work the call list or follow up on quiet deals.</p>
        </div>
      ) : (
        <ol className="px-2 pb-2">
          {d.agenda.map((a) => {
            const end = a.minutes ? new Date(a.start.getTime() + a.minutes * 60_000) : null
            const past = (end ?? new Date(a.start.getTime() + 30 * 60_000)).getTime() <= now && !a.live
            const spotlight = next?.id === a.id
            const ic = AGENDA_ICON[a.kind]
            const body = (
              <>
                <span className="w-12 shrink-0 pt-0.5 text-right">
                  <span className={cn('block text-sm font-semibold tabular-nums', past && 'text-muted-foreground')}>{time(a.start)}</span>
                  {a.minutes ? <span className="block text-[11px] tabular-nums text-muted-foreground">{a.minutes}′</span> : null}
                </span>
                <span className={cn(past && 'opacity-60')}>
                  <IconChip tone={ic.tone} size="sm">
                    {ic.icon}
                  </IconChip>
                </span>
                <span className={cn('min-w-0 flex-1', past && 'opacity-60')}>
                  <span dir="auto" className="block truncate text-sm font-medium">{a.title}</span>
                  {a.sub ? <span dir="auto" className="block truncate text-xs text-muted-foreground">{a.sub}</span> : null}
                </span>
              </>
            )
            return (
              <li key={a.id} className={cn('relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition', spotlight ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/30')}>
                {a.href ? (
                  <Link href={a.href} className="flex min-w-0 flex-1 items-center gap-3">
                    {body}
                  </Link>
                ) : (
                  <span className="flex min-w-0 flex-1 items-center gap-3">{body}</span>
                )}
                <span className="flex shrink-0 items-center gap-2">
                  {a.kind === 'meeting' || a.kind === 'team' ? <StartsIn start={a.start.toISOString()} end={end?.toISOString() ?? null} serverNow={now} live={a.live} /> : null}
                  {a.meetUrl && !past ? (
                    <a href={a.meetUrl} target="_blank" rel="noreferrer" className={BTN}>
                      <Video className="h-3.5 w-3.5" aria-hidden /> Join
                    </a>
                  ) : null}
                  {a.task && !past ? <DoneButton leadId={a.task.leadId} taskId={a.task.taskId} className={BTN} /> : null}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

const ACTION_ICON: Record<ActionItem['tone'], { icon: React.ReactNode; tone: Tone }> = {
  offer: { icon: <Eye className="h-4 w-4" />, tone: 'emerald' },
  email: { icon: <Mail className="h-4 w-4" />, tone: 'sky' },
  reply: { icon: <MailQuestion className="h-4 w-4" />, tone: 'amber' },
  task: { icon: <ListTodo className="h-4 w-4" />, tone: 'rose' },
  lead: { icon: <UserPlus className="h-4 w-4" />, tone: 'violet' },
  list: { icon: <PhoneCall className="h-4 w-4" />, tone: 'blue' },
}

function NeedsYou({ d }: { d: TodayData }): React.ReactElement {
  return (
    <section className="relative min-w-0 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/[0.09] to-card/60 shadow-[0_20px_50px_-30px_hsl(var(--primary)/0.6)]">
      <PanelHeader
        title="Needs you"
        hint={d.actions.length ? 'The few things that move deals today, most urgent first' : undefined}
        action={d.actionsTotal > d.actions.length ? <span className="text-xs text-muted-foreground">+{d.actionsTotal - d.actions.length} more</span> : null}
      />
      {d.actions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 pb-10 pt-4 text-center">
          <IconChip tone="emerald">
            <CheckCircle2 className="h-4 w-4" />
          </IconChip>
          <p className="text-sm font-medium">You’re all caught up</p>
          <p className="max-w-xs text-xs text-muted-foreground">No unread replies, quiet emails or overdue tasks.</p>
        </div>
      ) : (
        <ul className="space-y-1 px-2 pb-2">
          {d.actions.map((a) => {
            const ic = ACTION_ICON[a.tone]
            return (
              <li key={a.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-background/40">
                <IconChip tone={ic.tone} size="sm">
                  {ic.icon}
                </IconChip>
                <Link href={a.href} className="min-w-0 flex-1">
                  <span dir="auto" className="block truncate text-sm font-medium">{a.title}</span>
                  <span dir="auto" className="block truncate text-xs text-muted-foreground">{a.sub}</span>
                </Link>
                {a.task ? (
                  <DoneButton leadId={a.task.leadId} taskId={a.task.taskId} className={BTN} />
                ) : a.dialer ? (
                  <StartCalling href={a.href} className={cn(BTN, 'border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90')}>
                    <PhoneCall className="h-3.5 w-3.5" aria-hidden /> {a.cta}
                  </StartCalling>
                ) : (
                  <Link href={a.href} className={BTN}>
                    {a.cta}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

const HEALTH: Record<DealRow['health'], { label: string; dot: string; text: string }> = {
  good: { label: 'On track', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  watch: { label: 'Watch', dot: 'bg-amber-400', text: 'text-amber-300' },
  risk: { label: 'At risk', dot: 'bg-rose-400', text: 'text-rose-300' },
}

const initials = (name: string): string =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('') || '#'

function DealsToMove({ d }: { d: TodayData }): React.ReactElement {
  return (
    <section className={cn(PANEL, 'min-w-0')}>
      <PanelHeader title="Deals to move" hint={`Hottest first; a deal quiet for ${d.threshold}+ days moves up`} action={<HeaderLink href="/sales/board">Board</HeaderLink>} />
      {d.deals.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-muted-foreground">No open deals yet. Find businesses on the Leads page to start a call list.</p>
      ) : (
        <ul className="px-2 pb-2">
          {d.deals.map((l) => {
            const h = HEALTH[l.health]
            return (
              <li key={l.id}>
                <Link href={`/sales/leads/${l.id}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-muted/30 sm:grid-cols-[auto_minmax(0,1fr)_7rem_4.5rem_5.5rem]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-[hsl(var(--accent))] ring-1 ring-border">{initials(l.company ?? l.name)}</span>
                  <span className="min-w-0">
                    <span dir="auto" className="block truncate text-sm font-medium">{l.company ?? l.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {l.company && l.company !== l.name ? `${l.name} · ` : ''}
                      {STATUS_LABEL[l.status]}
                    </span>
                  </span>
                  <span className="hidden items-center gap-2 sm:flex" title={`${STATUS_LABEL[l.status]}: ${l.progress}% of the way`}>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full bg-gradient-to-r from-primary to-[hsl(var(--accent))]" style={{ width: `${l.progress}%` }} />
                    </span>
                    <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">{l.progress}%</span>
                  </span>
                  <span className="hidden text-right text-xs tabular-nums text-muted-foreground sm:block">{l.quietDays === 0 ? 'today' : `${l.quietDays}d ago`}</span>
                  <span className={cn('inline-flex items-center justify-end gap-1.5 whitespace-nowrap text-xs font-medium', h.text)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', h.dot)} aria-hidden /> {h.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function Calling({ d }: { d: TodayData }): React.ReactElement {
  const c = d.calls
  const max = Math.max(...c.perDay.map((p) => p.calls), 1)
  return (
    <section className={cn(PANEL, 'min-w-0 p-5')}>
      <div className="flex items-center gap-2.5">
        <IconChip tone="blue" size="sm">
          <PhoneCall className="h-4 w-4" />
        </IconChip>
        <h2 className="flex-1 font-semibold tracking-tight">Calling</h2>
        <HeaderLink href="/sales/calls">Calls</HeaderLink>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { v: c.today.calls, l: 'today' },
          { v: c.week ? `${Math.round((c.connected / c.week) * 100)}%` : '–', l: 'connect rate' },
          { v: c.avgScore ?? '–', l: 'avg. score' },
        ].map((s) => (
          <div key={s.l} className="rounded-xl bg-background/40 px-3 py-2.5 ring-1 ring-border/60">
            <div className="text-lg font-semibold tabular-nums leading-tight">{s.v}</div>
            <div className="text-[11px] text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex h-16 items-stretch gap-1.5" aria-label={`Calls per day this week: ${c.perDay.map((p) => p.calls).join(', ')}`}>
        {c.perDay.map((p, i) => (
          <div key={p.key} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end overflow-hidden rounded-md bg-muted/50" title={`${p.calls} call${p.calls === 1 ? '' : 's'} · ${p.connected} connected`}>
              {p.calls ? <div className={cn('w-full rounded-md', i === 6 ? 'bg-primary' : 'bg-primary/45')} style={{ height: `${Math.max(14, (p.calls / max) * 100)}%` }} /> : null}
            </div>
            <span className={cn('text-[10px]', i === 6 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{p.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span>
          {c.week} call{c.week === 1 ? '' : 's'} · {c.talkMin} min talk this week
        </span>
        {c.toCall ? (
          <StartCalling href="/sales/call-lists" className="inline-flex items-center gap-1 font-medium text-[hsl(var(--accent))] hover:underline">
            <ListChecks className="h-3.5 w-3.5" aria-hidden /> {c.toCall} to call
          </StartCalling>
        ) : null}
      </div>
    </section>
  )
}

function Recent({ d }: { d: TodayData }): React.ReactElement {
  return (
    <section className={cn(PANEL, 'min-w-0')}>
      <PanelHeader title="Recent" action={<HeaderLink href="/sales/leads">Leads</HeaderLink>} />
      {d.recent.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted-foreground">Nothing new on your contacts this week.</p>
      ) : (
        <ol className="relative mx-5 mb-5 space-y-3.5 border-s border-border/80 ps-4">
          {d.recent.map((r) => (
            <li key={r.id} className="relative">
              <span className={cn('absolute -start-[21px] top-1.5 h-2 w-2 rounded-full ring-4 ring-card', r.action === 'email.received' ? 'bg-sky-400' : r.action === 'lead.created' ? 'bg-emerald-400' : r.action === 'call.analyzed' ? 'bg-violet-400' : 'bg-primary')} aria-hidden />
              <Link href={`/sales/leads/${r.leadId}`} className="group block">
                <span className="flex items-baseline justify-between gap-2">
                  <span dir="auto" className="truncate text-sm font-medium group-hover:underline">{r.leadName}</span>
                  <time className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(r.at, d.now)}</time>
                </span>
                <span dir="auto" className="block truncate text-xs text-muted-foreground">{r.text}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/* ───────────────────────── page ───────────────────────── */

async function calendarItems(user: Awaited<ReturnType<typeof requireUser>>, tz: string): Promise<CalendarItem[]> {
  const now = new Date()
  const winStart = new Date(startOfLocalDay(now, tz).getTime() - 62 * 864e5)
  const winEnd = new Date(startOfLocalDay(now, tz).getTime() + 186 * 864e5)
  await pushPendingEntries(user.id).catch(() => undefined) // entries made before Google was connected
  const [{ mine, leads: byId }, bookings, entries] = await Promise.all([
    tasksForUser(user),
    user.role === 'MARKETING'
      ? Promise.resolve([])
      : prisma.booking.findMany({
          where: { status: 'CONFIRMED', startTime: { lt: winEnd }, endTime: { gt: winStart }, ...(await bookingScope(user)) },
          orderBy: { startTime: 'asc' },
          take: 500,
          select: { id: true, title: true, guestName: true, guestEmail: true, startTime: true, endTime: true, leadId: true, meetUrl: true, source: true, notes: true, attendees: true, host: { select: { name: true } }, lead: { select: { company: true, phone: true } } },
        }),
    prisma.calendarEntry.findMany({ where: { ownerId: user.id, startTime: { lt: winEnd }, endTime: { gt: winStart } }, orderBy: { startTime: 'asc' }, take: 500 }),
  ])
  return [
    ...bookings.map((b): CalendarItem => ({
      id: `b-${b.id}`,
      title: b.source === 'TEAM_MEETING' ? b.title : `${b.title} · ${b.guestName}`,
      start: b.startTime.toISOString(),
      end: b.endTime.toISOString(),
      allDay: false,
      color: entryColorVar(b.source === 'TEAM_MEETING' ? 'violet' : 'emerald'),
      kind: 'booking',
      href: b.leadId ? `/sales/leads/${b.leadId}` : undefined,
      meetUrl: b.meetUrl ?? undefined,
      notes: b.notes ?? undefined,
      details: {
        type: b.source === 'TEAM_MEETING' ? 'Team meeting' : b.source === 'PUBLIC_PAGE' ? 'Meeting · booked via booking page' : 'Meeting · sales invite',
        host: b.host.name ?? undefined,
        guest: b.source === 'TEAM_MEETING' ? undefined : b.guestName,
        guestEmail: b.source === 'TEAM_MEETING' ? undefined : b.guestEmail,
        phone: b.lead?.phone ?? undefined,
        company: b.lead?.company ?? undefined,
        attendees: Array.isArray(b.attendees) ? b.attendees.filter((a): a is string => typeof a === 'string') : undefined,
      },
    })),
    ...mine
      .filter((t) => !t.done && t.dueAt && t.dueAt >= winStart && t.dueAt < winEnd)
      .map((t): CalendarItem => {
        const l = byId.get(t.leadId)
        return {
          id: `t-${t.id}`,
          title: `Task: ${t.title}`,
          start: t.dueAt!.toISOString(),
          end: new Date(t.dueAt!.getTime() + 30 * 60_000).toISOString(),
          allDay: false,
          color: entryColorVar('amber'),
          kind: 'task',
          href: l ? `/sales/leads/${t.leadId}` : undefined,
          details: { type: 'Task due', guest: l ? [l.firstName, l.lastName].filter(Boolean).join(' ') || undefined : undefined, guestEmail: l?.email ?? undefined, phone: l?.phone ?? undefined, company: l?.company ?? undefined },
        }
      }),
    ...entries.map((e): CalendarItem => ({
      id: e.id,
      title: e.title,
      start: e.startTime.toISOString(),
      end: e.endTime.toISOString(),
      allDay: e.allDay,
      color: entryColorVar(e.color),
      kind: 'entry',
      notes: e.notes ?? undefined,
      details: { type: 'Personal event', synced: e.googleEventId ? 'On your Google Calendar' : 'Not on Google Calendar' },
    })),
  ]
}

export default async function TodayPage(): Promise<React.ReactElement> {
  const user = await requireUser()
  const d = await loadToday(user)
  const items = await calendarItems(user, d.tz)
  // Your week on the Straight Line (salespeople and admins who call)
  const lineWeek = d.seller && user.role !== 'MARKETING' ? await Promise.all([loadRepWeek(user.id), lessonLinksFor(user)]).catch(() => null) : null
  const upcoming = items.filter((i) => new Date(i.end).getTime() > d.now.getTime() && new Date(i.start).getTime() < d.now.getTime() + 7 * 864e5).length
  const needs = d.actionsTotal
  const soon = d.agenda.some((a) => (a.kind === 'meeting' || a.kind === 'team') && Math.abs(a.start.getTime() - d.now.getTime()) < 15 * 60_000)

  return (
    <div className="space-y-5">
      <MailSyncTrigger />
      {d.meetingsToday ? <MeetingSyncTrigger everyMs={soon ? 60_000 : 0} /> : null}

      <header className="flex flex-wrap items-end justify-between gap-4 pb-1">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight sm:text-3xl">
            {greeting(d.tz)}
            {d.firstName ? `, ${d.firstName}` : ''}
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{new Intl.DateTimeFormat('en-US', { timeZone: d.tz, weekday: 'long', month: 'short', day: 'numeric' }).format(d.now)}</span>
            {d.seller ? (
              <>
                <span aria-hidden className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                <span>
                  {d.meetingsToday} meeting{d.meetingsToday === 1 ? '' : 's'}
                </span>
              </>
            ) : null}
            <span aria-hidden className="h-1 w-1 rounded-full bg-muted-foreground/50" />
            <span className={needs ? 'font-medium text-foreground' : undefined}>{needs ? `${needs} thing${needs === 1 ? '' : 's'} need${needs === 1 ? 's' : ''} you` : 'All caught up'}</span>
          </p>
        </div>
        {d.seller ? (
          <div className="flex gap-2">
            <Link href="/sales/invite" className="inline-flex items-center gap-1.5 rounded-xl border bg-card/60 px-3.5 py-2 text-sm font-medium transition hover:border-primary/50 hover:bg-card">
              <Send className="h-4 w-4 text-muted-foreground" aria-hidden /> Send invite
            </Link>
            <Link href="/sales/leads" className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-[0_8px_24px_-10px_hsl(var(--primary)/0.9)] transition hover:bg-primary/90">
              <Plus className="h-4 w-4" aria-hidden /> Add lead
            </Link>
          </div>
        ) : null}
      </header>

      <Kpis d={d} />

      {lineWeek ? <WeekLineCard title="Your week on the Straight Line" week={lineWeek[0].week} prevDiscipline={lineWeek[0].prev.discipline} lessons={lineWeek[1]} callHref={(id) => `/sales/calls/${id}`} /> : null}

      {/* Two independent columns on desktop (no gaps under a short panel); on a phone one column, most urgent first. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:items-start">
        <div className="contents lg:col-span-7 lg:flex lg:min-w-0 lg:flex-col lg:gap-5">
          <div className="order-2 min-w-0">
            <YourDay d={d} />
          </div>
          <div className="order-4 min-w-0">
            <DealsToMove d={d} />
          </div>
        </div>
        <div className="contents lg:col-span-5 lg:flex lg:min-w-0 lg:flex-col lg:gap-5">
          <div className="order-1 min-w-0">
            <NeedsYou d={d} />
          </div>
          {d.seller ? (
            <div className="order-3 min-w-0">
              <Calling d={d} />
            </div>
          ) : null}
          <div className="order-5 min-w-0">
            <Recent d={d} />
          </div>
        </div>
      </div>

      <CalendarSection items={items} timeZone={d.tz} summary={upcoming ? `${upcoming} item${upcoming === 1 ? '' : 's'} in the next 7 days` : 'Nothing in the next 7 days'} />
    </div>
  )
}
