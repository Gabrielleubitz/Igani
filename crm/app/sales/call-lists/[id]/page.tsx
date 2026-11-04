import type { ProspectStatus } from '@prisma/client'
import { ChevronLeft, ExternalLink, Globe, Star } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CallListHeader, ProspectActions } from '@/components/crm/CallListControls'
import { requireUser } from '@/lib/auth'
import { OPEN_PROSPECT, PROSPECT_STATUS_LABEL } from '@/lib/call-lists'
import { CALL_OUTCOMES } from '@/lib/calls'
import { formatDateTime } from '@/lib/format'
import { formatPhone } from '@/lib/phone-numbers'
import { prisma } from '@/lib/prisma'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Call list' }
export const dynamic = 'force-dynamic'

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
  const count = (statuses: ProspectStatus[] | null): number => counts.filter((c) => !statuses || statuses.includes(c.status)).reduce((a, c) => a + c._count, 0)

  return (
    <div className="space-y-5">
      <Link href="/sales/call-lists" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Call lists
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 dir="auto" className="text-2xl font-semibold tracking-tight">{list.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[list.query ? `Google Maps: “${list.query}”` : null, user.role === 'ADMIN' ? `Called by ${list.ownerId === user.id ? 'you' : list.owner ? (list.owner.name ?? list.owner.email) : 'nobody'}` : null].filter(Boolean).join(' · ')}
            {' · '}Call from here or from the dialer’s Lists tab.
          </p>
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
          {prospects.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
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
              </div>
              <ProspectActions prospect={{ id: p.id, name: p.name, phone: p.phone, status: p.status, leadId: p.leadId }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
