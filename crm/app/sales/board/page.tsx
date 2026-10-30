import type { Prisma } from '@prisma/client'
import { CrmSubNav } from '@/components/crm/CrmSubNav'
import { KanbanBoard } from '@/components/crm/KanbanBoard'
import { LeadFilters } from '@/components/crm/LeadFilters'
import { requireUser } from '@/lib/auth'
import { leadName } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { filterLeads } from '@/components/crm/crm-utils'

export const metadata = { title: 'Pipeline board' }

type SP = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v) || undefined

export default async function BoardPage({ searchParams }: { searchParams: SP }): Promise<React.ReactElement> {
  const user = await requireUser(['ADMIN', 'SALES'])
  const isAdmin = user.role === 'ADMIN'
  const scope: Prisma.LeadWhereInput = isAdmin ? {} : { OR: [{ assignedToId: user.id }, { assignedToId: null }] }
  const f = { q: one(searchParams.q), status: one(searchParams.status), source: one(searchParams.source), owner: one(searchParams.owner) }

  const [all, reps] = await Promise.all([
    prisma.lead.findMany({ where: scope, orderBy: { createdAt: 'desc' }, take: 2000, include: { assignedTo: { select: { name: true, email: true } } } }),
    prisma.user.findMany({ where: { role: { in: ['SALES', 'ADMIN'] } }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }),
  ])
  const leads = filterLeads(all, f)
  const sources = [...new Set(all.map((l) => l.source))].sort()

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Pipeline</h1>
      <CrmSubNav active="/sales/board" />
      <LeadFilters
        action="/sales/board"
        values={f}
        sources={sources}
        reps={reps.map((r) => ({ id: r.id, label: r.name ?? r.email ?? r.id }))}
        exportHref={`/sales/export?${new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString()}`}
      />
      <p className="mb-3 text-xs text-muted-foreground">
        {leads.length} lead{leads.length === 1 ? '' : 's'} · drag cards between columns to change stage
      </p>
      <KanbanBoard
        leads={leads.map((l) => ({
          id: l.id,
          name: leadName(l),
          company: l.company,
          email: l.email,
          owner: l.assignedTo ? (l.assignedTo.name ?? l.assignedTo.email) : null,
          budget: l.budget,
          status: l.status,
          canMove: isAdmin || l.assignedToId === user.id,
        }))}
      />
    </div>
  )
}
