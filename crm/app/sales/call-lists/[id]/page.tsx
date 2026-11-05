import { ListChecks } from 'lucide-react'
import { GradientChip } from '@/components/ui/tone'
import type { ProspectStatus } from '@prisma/client'
import { ChevronLeft, Clock, ExternalLink, Globe, Mail, MessageCircle, Star, UserRound } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CallListHeader, DetailsRefresher, ProspectActions, RefreshDetails } from '@/components/crm/CallListControls'
import { CallLink } from '@/components/dialer/Dialer'
import { allPhones, asDetails } from '@/lib/prospect-details'
import { requireUser } from '@/lib/auth'
import { OPEN_PROSPECT, PROSPECT_STATUS_LABEL } from '@/lib/call-lists'
import { CALL_OUTCOMES } from '@/lib/calls'
import { formatDateTime } from '@/lib/format'
import { formatPhone } from '@/lib/phone-numbers'
import { prisma } from '@/lib/prisma'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Call list' }
export const dynamic = 'force-dynamic'
// "Look again" reads a website in the request
export const maxDuration = 120

const FILTERS: { key: string; label: string; statuses: ProspectStatus[] | null }[] = [
  { key: 'open', label: 'To call', statuses: OPEN_PROSPECT },
  { key: 'won', label: 'Became leads', statuses: ['CONVERTED'] },
  { key: 'lost', label: 'Not a fit', statuses: ['NOT_INTERESTED', 'BAD_NUMBER'] },
  { key: 'all', label: 'All', statuses: null },
]

const STATUS_TONE: Record<ProspectStatus, string> = {
  TO_CALL: 'border-sky-500/30 text-sky-300',
  CALLBACK: 'border-amber-500/40 text-amber-300',
  CONVERTED: 'border-emerald-500/40 text-emerald-300',
  NOT_INTERESTED: 'text-muted-foreground',
  BAD_NUMBER: 'text-muted-foreground',
}

export default async function CallListPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ show?: string }> }): Promise<React.ReactElement> {
  const user = await requireUser(['ADMIN', 'SALES'])
  const { id } = await props.params
  const { show } = await props.searchParams
  const list = await prisma.callList.findUnique({ where: { id }, select: { id: true, name: true, query: true, ownerId: true, owner: { select: { name: true, email: true } } } })
  if (!list || (user.role !== 'ADMIN' && list.ownerId !== user.id)) notFound()
  const filter = FILTERS.find((f) => f.key === show) ?? FILTERS[0]!
  const [prospects, counts, me, team] = await Promise.all([
    prisma.prospect.findMany({
      where: { listId: list.id, ...(filter.statuses ? { status: { in: filter.statuses } } : {}) },
      orderBy: [{ status: 'desc' }, { attempts: 'asc' }, { createdAt: 'asc' }],
      take: 500,
    }),
    prisma.prospect.groupBy({ by: ['status'], where: { listId: list.id }, _count: true }),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } }),
    user.role === 'ADMIN' ? prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SALES'] } }, orderBy: { name: 'asc' }, select: { id: true, name: true, email: true } }) : Promise.resolve(null),
  ])
  const looking = prospects.some((p) => p.enrichStatus === 'pending' || p.enrichStatus === 'processing')
  const count = (statuses: ProspectStatus[] | null): number => counts.filter((c) => !statuses || statuses.includes(c.status)).reduce((a, c) => a + c._count, 0)

  return (
    <div className="space-y-5">
      <DetailsRefresher active={looking} />
      <Link href="/sales/call-lists" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Call lists
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3.5">
        <GradientChip tone="teal" className="mt-0.5">
          <ListChecks />
        </GradientChip>
        <div className="min-w-0">
          <h1 dir="auto" className="text-2xl font-semibold tracking-tight">{list.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[list.query ? `Google Maps: “${list.query}”` : null, user.role === 'ADMIN' ? `Called by ${list.ownerId === user.id ? 'you' : list.owner ? (list.owner.name ?? list.owner.email) : 'nobody'}` : null].filter(Boolean).join(' · ')}
            {' · '}Call from here or from the dialer’s Lists tab.
          </p>
        </div>
        </div>
        <CallListHeader listId={list.id} name={list.name} ownerId={list.ownerId} teammates={team ? team.map((t) => ({ id: t.id, name: t.name ?? t.email ?? 'Teammate' })) : null} />
      </div>

      <nav aria-label="Show" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === 'open' ? `/sales/call-lists/${list.id}` : `/sales/call-lists/${list.id}?show=${f.key}`}
            className={cn('whitespace-nowrap rounded-full border px-3 py-1 text-sm', f.key === filter.key ? 'border-primary/50 bg-primary/15 font-medium' : 'text-muted-foreground hover:bg-muted')}
          >
            {f.label} <span className="ml-1 tabular-nums text-muted-foreground">{count(f.statuses)}</span>
          </Link>
        ))}
      </nav>

      {prospects.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">{filter.key === 'open' ? 'Everyone on this list has been called.' : 'Nothing here.'}</p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {prospects.map((p) => {
            const d = asDetails(p.details)
            const phones = allPhones(p.phone, d)
            const ref = { id: p.id, name: p.name }
            return (
            <li key={p.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span dir="auto" className="font-medium">{p.name}</span>
                  {p.category ? <span className="text-xs text-muted-foreground">{p.category}</span> : null}
                  <span className={cn('rounded-full border px-1.5 py-px text-[11px]', STATUS_TONE[p.status])}>{PROSPECT_STATUS_LABEL[p.status]}</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span dir="ltr" className="tabular-nums">{formatPhone(p.phone)}</span>
                  {p.rating != null ? (
                    <span className="inline-flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden /> {p.rating.toFixed(1)}
                      {p.reviews != null ? ` (${p.reviews})` : ''}
                    </span>
                  ) : null}
                  {p.website ? (
                    <a href={p.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                      <Globe className="h-3 w-3" aria-hidden /> {p.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                    </a>
                  ) : null}
                  {p.mapsUrl ? (
                    <a href={p.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                      <ExternalLink className="h-3 w-3" aria-hidden /> Maps
                    </a>
                  ) : null}
                  {p.attempts ? (
                    <span>
                      Called {p.attempts}×{p.lastOutcome ? ` · ${CALL_OUTCOMES[p.lastOutcome as keyof typeof CALL_OUTCOMES] ?? p.lastOutcome}` : ''}
                      {p.lastCalledAt ? ` · ${formatDateTime(p.lastCalledAt, me.timeZone)}` : ''}
                    </span>
                  ) : null}
                </div>
                {p.address ? <div dir="auto" className="truncate text-xs text-muted-foreground">{p.address}</div> : null}
                {p.notes ? <div dir="auto" className="whitespace-pre-line text-sm text-foreground/90">{p.notes}</div> : null}
                <Details prospect={ref} website={p.website} status={p.enrichStatus} d={d} phones={phones} />
              </div>
              <ProspectActions prospect={{ id: p.id, name: p.name, phone: p.phone, status: p.status, leadId: p.leadId }} />
            </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

const SOCIAL_LABEL: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', tiktok: 'TikTok', youtube: 'YouTube', x: 'X' }

/** What we found about the business: people, every number, emails, WhatsApp, social pages, summary, hours. */
function Details({
  prospect,
  website,
  status,
  d,
  phones,
}: {
  prospect: { id: string; name: string }
  website: string | null
  status: string | null
  d: ReturnType<typeof asDetails>
  phones: ReturnType<typeof allPhones>
}): React.ReactElement | null {
  const others = phones.slice(1)
  const has = Boolean(d.contacts?.length || others.length || d.emails?.length || d.socials?.length || d.summary || d.services?.length || d.hours?.length)
  const pill = 'inline-flex items-center gap-1 rounded-md border bg-muted/30 px-1.5 py-0.5 text-xs transition hover:border-primary/50 hover:text-foreground'
  return (
    <div className="mt-2 space-y-2">
      {status === 'pending' || status === 'processing' ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" aria-hidden /> Reading their website for contacts, numbers and emails…
        </p>
      ) : null}
      {d.summary ? (
        <p dir="auto" className="text-sm text-foreground/90">
          {d.summary}
        </p>
      ) : null}
      {d.services?.length ? <p dir="auto" className="text-xs text-muted-foreground">{d.services.join(' · ')}</p> : null}
      {d.contacts?.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {d.contacts.map((c, i) => (
            <li key={i} className="inline-flex flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1 text-xs">
              <UserRound className="h-3 w-3 text-primary" aria-hidden />
              <span dir="auto" className="font-medium">{c.name}</span>
              {c.role ? <span dir="auto" className="text-muted-foreground">{c.role}</span> : null}
              {c.phone ? (
                <CallLink phone={c.phone} prospect={prospect} className="tabular-nums text-emerald-300 hover:underline">
                  <span dir="ltr">{formatPhone(c.phone)}</span>
                </CallLink>
              ) : null}
              {c.email ? (
                <a href={`mailto:${c.email}`} className="text-sky-300 hover:underline">
                  {c.email}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {others.length || d.emails?.length || d.socials?.length ? (
        <div className="flex flex-wrap gap-1.5 text-muted-foreground">
          {others.map((ph) => (
            <CallLink key={ph.e164} phone={ph.e164} prospect={prospect} className={pill}>
              {ph.label === 'WhatsApp' ? <MessageCircle className="h-3 w-3" aria-hidden /> : null}
              <span dir="ltr" className="tabular-nums">{ph.display}</span>
              {ph.label && ph.label !== 'WhatsApp' ? <span dir="auto" className="text-muted-foreground">· {ph.label}</span> : null}
            </CallLink>
          ))}
          {(d.emails ?? []).map((e) => (
            <a key={e} href={`mailto:${e}`} className={pill}>
              <Mail className="h-3 w-3" aria-hidden /> {e}
            </a>
          ))}
          {(d.socials ?? []).map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className={pill}>
              <ExternalLink className="h-3 w-3" aria-hidden /> {SOCIAL_LABEL[s.kind] ?? s.kind}
            </a>
          ))}
        </div>
      ) : null}
      {d.hours?.length ? (
        <details className="text-xs text-muted-foreground">
          <summary className="inline-flex cursor-pointer items-center gap-1 hover:text-foreground">
            <Clock className="h-3 w-3" aria-hidden /> Opening hours
          </summary>
          <ul className="mt-1 space-y-0.5 ps-4">
            {d.hours.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </details>
      ) : null}
      {website && status !== 'pending' && status !== 'processing' ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {status === 'failed' ? <span>Their website couldn’t be read.</span> : status === 'done' && !has ? <span>Nothing more on their website.</span> : null}
          <RefreshDetails prospectId={prospect.id} label={status === 'done' || status === 'failed' ? 'Look again' : 'Find contacts on their website'} />
        </div>
      ) : null}
    </div>
  )
}
