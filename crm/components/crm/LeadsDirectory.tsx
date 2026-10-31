import Link from 'next/link'
import { LeadsTable } from '@/app/admin/_components/LeadsTable'
import { NewLeadForm } from '@/app/admin/_components/NewLeadForm'
import { PageIntro } from '@/components/PageIntro'
import { buttonVariants } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import type { SessionUser } from '@/lib/auth'
import { LEAD_STATUSES, STATUS_LABEL, leadName } from '@/lib/format'
import { leadScope } from '@/lib/lead-access'
import { PAGE_SIZE, buildLeadWhere, parseLeadFilters } from '@/lib/lead-query'
import { prisma } from '@/lib/prisma'

/** Contact directory. Admins see everyone; others see their own contacts plus unassigned ones. */
export async function LeadsDirectory({ searchParams, basePath, user }: { searchParams: Record<string, string | string[] | undefined>; basePath: string; user: SessionUser }): Promise<React.ReactElement> {
  const f = parseLeadFilters(searchParams)
  const scope = leadScope(user)
  const where = { AND: [buildLeadWhere(f), scope] }
  const [total, leads, reps, sources, tagRows, stageCounts] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (f.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { assignedTo: { select: { name: true, email: true } } },
    }),
    prisma.user.findMany({ where: { role: { in: ['SALES', 'ADMIN'] } }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }),
    prisma.lead.findMany({ where: scope, distinct: ['source'], select: { source: true }, orderBy: { source: 'asc' } }),
    prisma.$queryRaw<{ tag: string }[]>`SELECT DISTINCT unnest(tags) AS tag FROM "Lead" ORDER BY tag LIMIT 200`,
    prisma.lead.groupBy({ by: ['status'], where: { AND: [buildLeadWhere({ ...f, status: undefined }), scope] }, _count: { _all: true } }),
  ])
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const query: Record<string, string | undefined> = { q: f.q, status: f.status, assignee: f.assignee, source: f.source, tag: f.tag, archived: f.archived ? '1' : undefined }
  const link = (patch: Record<string, string | undefined>): string => {
    const q = Object.fromEntries(Object.entries({ ...query, ...patch }).filter(([, v]) => v)) as Record<string, string>
    const s = new URLSearchParams(q).toString()
    return s ? `${basePath}?${s}` : basePath
  }
  const counts = new Map(stageCounts.map((c) => [c.status, c._count._all]))
  const allCount = stageCounts.reduce((n, c) => n + c._count._all, 0)
  const activeFilters = [f.assignee, f.source, f.tag, f.archived].filter(Boolean).length
  const rows = leads.map((l) => ({
    id: l.id,
    name: leadName(l),
    email: l.email,
    company: l.company,
    status: l.status,
    source: l.source,
    owner: l.assignedTo ? (l.assignedTo.name ?? l.assignedTo.email) : null,
    assignedToId: l.assignedToId,
    createdAt: l.createdAt.toISOString(),
    tags: l.tags,
    dealValue: l.dealValue,
    lostReason: l.lostReason,
  }))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageIntro
          title={f.archived ? 'Archived contacts' : 'Contacts'}
          hint={user.role === 'ADMIN' ? 'Everyone in the CRM. Search, filter, change a stage, or open a name for notes, tasks and meetings.' : 'Your contacts plus unassigned ones you can claim. Open a name for notes, tasks and meetings.'}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/sales/import" className={buttonVariants({ variant: 'outline' })}>
            Import CSV
          </Link>
          <details className="group relative">
            <summary className={`${buttonVariants()} cursor-pointer list-none`}>+ Add contact</summary>
            <div className="absolute right-0 z-30 mt-2 w-[min(92vw,34rem)] rounded-xl border bg-card p-4 shadow-2xl">
              <NewLeadForm />
            </div>
          </details>
        </div>
      </div>

      <nav aria-label="Stages" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        <Link href={link({ status: undefined, page: undefined })} className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm ${!f.status ? 'border-primary/50 bg-primary/15 font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
          All <span className="ml-1 tabular-nums text-muted-foreground">{allCount}</span>
        </Link>
        {LEAD_STATUSES.map((s) => (
          <Link key={s} href={link({ status: s, page: undefined })} className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm ${f.status === s ? 'border-primary/50 bg-primary/15 font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
            {STATUS_LABEL[s]} <span className="ml-1 tabular-nums text-muted-foreground">{counts.get(s) ?? 0}</span>
          </Link>
        ))}
      </nav>

      <details open={activeFilters > 0} className="rounded-lg border bg-card/40 px-4 py-2">
        <summary className="cursor-pointer select-none text-sm font-medium">
          More filters{activeFilters ? ` (${activeFilters} active)` : ''}
        </summary>
        <form className="mt-3 grid grid-cols-2 items-end gap-2 pb-2 sm:grid-cols-3 lg:grid-cols-6" method="get">
          {f.q ? <input type="hidden" name="q" value={f.q} /> : null}
          {f.status ? <input type="hidden" name="status" value={f.status} /> : null}
          <Select name="assignee" aria-label="Owner" defaultValue={f.assignee ?? ''} className="w-full">
            <option value="">Any owner</option>
            <option value="none">Unassigned</option>
            {(user.role === 'ADMIN' ? reps : reps.filter((r) => r.id === user.id)).map((r) => (
              <option key={r.id} value={r.id}>
                {r.id === user.id ? 'Me' : (r.name ?? r.email)}
              </option>
            ))}
          </Select>
          <Select name="source" aria-label="Source" defaultValue={f.source ?? ''} className="w-full">
            <option value="">Any source</option>
            {sources.map((s) => (
              <option key={s.source} value={s.source}>
                {s.source}
              </option>
            ))}
          </Select>
          <Select name="tag" aria-label="Tag" defaultValue={f.tag ?? ''} className="w-full">
            <option value="">Any tag</option>
            {tagRows.map((t) => (
              <option key={t.tag} value={t.tag}>
                {t.tag}
              </option>
            ))}
          </Select>
          <Select name="archived" aria-label="Archived" defaultValue={f.archived ? '1' : ''} className="w-full">
            <option value="">Active contacts</option>
            <option value="1">Archived</option>
          </Select>
          <button className={buttonVariants({ variant: 'secondary' })}>Apply</button>
          <Link href={basePath} className="self-center text-sm text-muted-foreground underline-offset-4 hover:underline">
            Clear all
          </Link>
        </form>
      </details>

      <LeadsTable rows={rows} reps={reps.map((r) => ({ id: r.id, label: r.name ?? r.email ?? r.id }))} archivedView={Boolean(f.archived)} query={query} isAdmin={user.role === 'ADMIN'} currentUserId={user.id} role={user.role} />
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          {total === 0 ? 'No contacts' : `Showing ${(f.page - 1) * PAGE_SIZE + 1}–${Math.min(f.page * PAGE_SIZE, total)} of ${total}`}
        </span>
        <div className="flex gap-2">
          {f.page > 1 ? (
            <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} href={link({ page: String(f.page - 1) })}>
              ← Previous
            </Link>
          ) : null}
          {f.page < pages ? (
            <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} href={link({ page: String(f.page + 1) })}>
              Next →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
