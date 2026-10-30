import Link from 'next/link'
import { LeadsTable } from '@/app/admin/_components/LeadsTable'
import { NewLeadForm } from '@/app/admin/_components/NewLeadForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/input'
import { LEAD_STATUSES, leadName } from '@/lib/format'
import { PAGE_SIZE, buildLeadWhere, parseLeadFilters } from '@/lib/lead-query'
import { prisma } from '@/lib/prisma'

/** Contact directory shared by every role; only admins get the bulk-delete control. */
export async function LeadsDirectory({ searchParams, basePath, isAdmin }: { searchParams: Record<string, string | string[] | undefined>; basePath: string; isAdmin: boolean }): Promise<React.ReactElement> {
  const f = parseLeadFilters(searchParams)
  const where = buildLeadWhere(f)
  const [total, leads, reps, sources, tagRows] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (f.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { assignedTo: { select: { name: true, email: true } } },
    }),
    prisma.user.findMany({ where: { role: { in: ['SALES', 'ADMIN'] } }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }),
    prisma.lead.findMany({ distinct: ['source'], select: { source: true } }),
    prisma.$queryRaw<{ tag: string }[]>`SELECT DISTINCT unnest(tags) AS tag FROM "Lead" ORDER BY tag LIMIT 200`,
  ])
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const query: Record<string, string | undefined> = { q: f.q, status: f.status, assignee: f.assignee, source: f.source, tag: f.tag, archived: f.archived ? '1' : undefined }
  const link = (page: number): string => `${basePath}?${new URLSearchParams({ ...Object.fromEntries(Object.entries(query).filter(([, v]) => v)), page: String(page) })}`
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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Leads {f.archived ? '(archived)' : ''}</h1>
      <form className="flex flex-wrap items-end gap-2" method="get">
        {f.q ? <input type="hidden" name="q" value={f.q} /> : null}
        <Select name="status" defaultValue={f.status ?? ''} className="w-44">
          <option value="">All stages</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </Select>
        <Select name="assignee" defaultValue={f.assignee ?? ''} className="w-44">
          <option value="">Any owner</option>
          <option value="none">Unassigned</option>
          {reps.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name ?? r.email}
            </option>
          ))}
        </Select>
        <Select name="source" defaultValue={f.source ?? ''} className="w-40">
          <option value="">Any source</option>
          {sources.map((s) => (
            <option key={s.source} value={s.source}>
              {s.source}
            </option>
          ))}
        </Select>
        <Select name="tag" defaultValue={f.tag ?? ''} className="w-36">
          <option value="">Any tag</option>
          {tagRows.map((t) => (
            <option key={t.tag} value={t.tag}>
              {t.tag}
            </option>
          ))}
        </Select>
        <Select name="archived" defaultValue={f.archived ? '1' : ''} className="w-32">
          <option value="">Active</option>
          <option value="1">Archived</option>
        </Select>
        <button className="h-10 rounded-md border px-4 text-sm">Filter</button>
      </form>
      <p className="text-sm text-muted-foreground">
        {total} lead{total === 1 ? '' : 's'} · page {f.page} of {pages}
      </p>
      <LeadsTable rows={rows} reps={reps.map((r) => ({ id: r.id, label: r.name ?? r.email ?? r.id }))} archivedView={Boolean(f.archived)} query={query} isAdmin={isAdmin} />
      <div className="flex gap-4 text-sm">
        {f.page > 1 ? <Link href={link(f.page - 1)}>← Previous</Link> : null}
        {f.page < pages ? <Link href={link(f.page + 1)}>Next →</Link> : null}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Add a lead</CardTitle>
        </CardHeader>
        <CardContent>
          <NewLeadForm />
        </CardContent>
      </Card>
    </div>
  )
}
