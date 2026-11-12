import { ArrowDownLeft, ArrowUpRight, CheckSquare, Mail, MessageSquare, Phone, Sparkles, Video } from 'lucide-react'
import type { SentimentProps } from '@/components/crm/lead/types'
import { SentimentGauge } from '@/components/crm/lead/SentimentGauge'
import type { TimelineItem } from '@/lib/lead-timeline'
import { cn } from '@/lib/utils'

const KIND_ICON = { email: Mail, sms: MessageSquare, call: Phone, meeting: Video, task: CheckSquare } as const

function Panel({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }): React.ReactElement {
  return (
    <section aria-label={title} className={cn('rounded-xl border bg-card p-4 shadow-sm', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }): React.ReactElement {
  return <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">{children}</p>
}

function Column({ title, icon: Icon, items, tz }: { title: string; icon: typeof ArrowUpRight; items: TimelineItem[]; tz: string }): React.ReactElement {
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: tz, day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <div className="rounded-lg border p-3">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden /> {title}
      </h3>
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No {title.toLowerCase()} activity on this contact.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((i) => {
            const K = KIND_ICON[i.kind as keyof typeof KIND_ICON] ?? Mail
            return (
              <li key={i.id} className="flex items-start gap-2 text-sm">
                <K className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 break-words">{i.title}</span>
                <time dateTime={i.at} className="shrink-0 text-xs text-muted-foreground">
                  {fmt.format(new Date(i.at))}
                </time>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export interface CatchUpProps {
  bullets: { label: string; text: string }[]
  /** the existing profile card ("what we know"), or null (marketing) */
  profile: React.ReactNode
  /** the on-demand "Brief me" button */
  brief: React.ReactNode
  inbound: TimelineItem[]
  outbound: TimelineItem[]
  status: string
  sentiment: SentimentProps | null
  challenges: string[]
  tz: string
  /** marketing sees no call-derived insights */
  showCallInsights: boolean
}

/** The Catch-up tab: where things stand, who spoke last, how they feel, what stands in the way. All worked out from data we already keep. */
export function CatchUp(p: CatchUpProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <h2 className="sr-only">Overview</h2>
      <Panel title="Contact insights" action={p.brief}>
        {p.bullets.length === 0 ? (
          <Empty>Nothing to summarise yet. After the first call, note or email, the highlights show up here.</Empty>
        ) : (
          <ul className="space-y-2 text-sm">
            {p.bullets.map((b) => (
              <li key={b.label} className="flex gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0">
                  <b>{b.label}:</b> <span className="text-muted-foreground">{b.text}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {p.profile}
      <Panel title="Recent interactions">
        <p className="mb-3 text-sm text-muted-foreground">{p.status}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <Column title="Inbound" icon={ArrowDownLeft} items={p.inbound} tz={p.tz} />
          <Column title="Outbound" icon={ArrowUpRight} items={p.outbound} tz={p.tz} />
        </div>
      </Panel>
      {p.showCallInsights ? (
        <>
          <h2 className="pt-2 text-base font-semibold">Health</h2>
          <Panel title="Sentiment">
            {p.sentiment ? (
              <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
                <p className="text-sm text-muted-foreground">
                  Based on how the last {p.sentiment.calls} analysed {p.sentiment.calls === 1 ? 'call' : 'calls'} went. {p.sentiment.label === 'Receptive' ? 'They are warm: keep the next step specific.' : p.sentiment.label === 'Cooling' ? 'They are cooling: ask what changed before pushing.' : 'No strong signal either way yet.'}
                </p>
                <SentimentGauge score={p.sentiment.score} label={p.sentiment.label} />
              </div>
            ) : (
              <Empty>No analysed calls yet, so there’s no sentiment to show.</Empty>
            )}
          </Panel>
          <Panel title="Challenges">
            {p.challenges.length === 0 ? (
              <Empty>No challenges found.</Empty>
            ) : (
              <ul className="list-disc space-y-1.5 pl-5 text-sm">
                {p.challenges.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      ) : null}
    </div>
  )
}
