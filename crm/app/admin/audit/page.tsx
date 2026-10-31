import type { EntityType } from '@prisma/client'
import { EntityType as EntityTypes } from '@prisma/client'
import Link from 'next/link'
import { PageIntro } from '@/components/PageIntro'
import { buttonVariants } from '@/components/ui/button'
import { requireUser } from '@/lib/auth'
import { formatDateTime, timeAgo } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Audit log' }
export const dynamic = 'force-dynamic'

const PAGE = 100
const TYPE_LABEL: Record<EntityType, string> = {
  LEAD: 'Contacts',
  BOOKING: 'Bookings',
  USER: 'Sign-ins',
  ALLOWED_USER: 'Team',
  BOOKING_PAGE: 'Booking pages',
  AVAILABILITY: 'Hours',
  SETTING: 'Settings',
}

function summarize(meta: unknown): string {
  if (!meta || typeof meta !== 'object') return ''
  return Object.entries(meta as Record<string, unknown>)
    .filter(([k]) => !['taskId', 'emailId', 'googleEventId'].includes(k))
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' · ')
    .slice(0, 300)
}

export default async function AuditPage({ searchParams }: { searchParams: { type?: string; entityId?: string; q?: string; page?: string } }): Promise<React.ReactElement> {
  const admin = await requireUser(['ADMIN'])
  const type = Object.values(EntityTypes).includes(searchParams.type as EntityType) ? (searchParams.type as EntityType) : undefined
  const page = Math.max(1, Number.parseInt(searchParams.page ?? '1', 10) || 1)
  const q = searchParams.q?.trim().slice(0, 60)
  const where = { ...(type ? { entityType: type } : {}), ...(searchParams.entityId ? { entityId: searchParams.entityId } : {}), ...(q ? { action: { contains: q, mode: 'insensitive' as const } } : {}) }
  const [logs, total, me] = await Promise.all([
    prisma.activityLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: PAGE, skip: (page - 1) * PAGE, include: { actor: { select: { name: true, email: true } } } }),
    prisma.activityLog.count({ where }),
    prisma.user.findUniqueOrThrow({ where: { id: admin.id }, select: { timeZone: true } }),
  ])
  const leadIds = logs.filter((l) => l.entityType === 'LEAD').map((l) => l.entityId)
  const leads = await prisma.lead.findMany({ where: { id: { in: leadIds } }, select: { id: true, email: true, firstName: true, lastName: true } })
  const leadName = new Map(leads.map((l) => [l.id, [l.firstName, l.lastName].filter(Boolean).join(' ') || l.email]))
  const now = new Date()
  const href = (patch: Record<string, string | undefined>): string => {
    const p = new URLSearchParams(Object.entries({ type, q, entityId: searchParams.entityId, ...patch }).filter(([, v]) => v) as [string, string][])
    return `/admin/audit${p.size ? `?${p}` : ''}`
  }
  const pill = (active: boolean): string => `rounded-full border px-3 py-1 ${active ? 'border-primary/50 bg-primary/15 font-medium' : 'text-muted-foreground hover:bg-muted'}`

  return (
    <div className="space-y-4">
      <PageIntro title="Audit log" hint="Every change in the CRM: who did what, and when. Filter by area or search an action like “status” or “email”." />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={href({ type: undefined, page: undefined })} className={pill(!type)}>
          All
        </Link>
        {Object.values(EntityTypes).map((t) => (
          <Link key={t} href={href({ type: t, page: undefined })} className={pill(type === t)}>
            {TYPE_LABEL[t]}
          </Link>
        ))}
        <form className="ml-auto flex gap-2" action="/admin/audit">
          {type ? <input type="hidden" name="type" value={type} /> : null}
          <input name="q" defaultValue={q} aria-label="Search actions" placeholder="Search actions…" className="h-9 w-44 rounded-md border border-input bg-background px-3 text-sm" />
        </form>
      </div>
      {searchParams.entityId ? (
        <p className="text-sm text-muted-foreground">
          Showing one record ·{' '}
          <Link href={href({ entityId: undefined })} className="text-primary underline-offset-4 hover:underline">
            show everything
          </Link>
        </p>
      ) : null}
      {logs.length === 0 ? <p className="text-sm text-muted-foreground">No activity matches.</p> : null}
      <div className="divide-y overflow-hidden rounded-lg border text-sm">
        {logs.map((l) => (
          <div key={l.id} className="grid gap-1 p-3 sm:grid-cols-[150px_1fr] sm:gap-4">
            <time className="text-xs text-muted-foreground" title={formatDateTime(l.createdAt, me.timeZone)} dateTime={l.createdAt.toISOString()}>
              {timeAgo(l.createdAt, now)}
              <span className="block text-[11px] opacity-70">{formatDateTime(l.createdAt, me.timeZone)}</span>
            </time>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2">
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{l.action}</code>
                <span className="text-muted-foreground">by</span>
                <span className="font-medium">{l.actor ? (l.actor.name ?? l.actor.email) : 'System'}</span>
                {l.entityType === 'LEAD' && leadName.has(l.entityId) ? (
                  <>
                    <span className="text-muted-foreground">on</span>
                    <Link href={`/sales/leads/${l.entityId}`} className="text-primary underline-offset-4 hover:underline">
                      {leadName.get(l.entityId)}
                    </Link>
                  </>
                ) : (
                  <Link href={href({ entityId: l.entityId, page: undefined })} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                    {TYPE_LABEL[l.entityType]} · {l.entityId.slice(0, 10)}
                  </Link>
                )}
              </div>
              {summarize(l.metadata) ? <p className="mt-1 break-words font-mono text-xs text-muted-foreground">{summarize(l.metadata)}</p> : null}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} event{total === 1 ? '' : 's'} · page {page} of {Math.max(1, Math.ceil(total / PAGE))}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link href={href({ page: String(page - 1) })} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
              ← Newer
            </Link>
          ) : null}
          {page * PAGE < total ? (
            <Link href={href({ page: String(page + 1) })} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
              Older →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
