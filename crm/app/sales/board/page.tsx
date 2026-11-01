import type { Prisma } from '@prisma/client'
import { KanbanBoard } from '@/components/crm/KanbanBoard'
import { LeadFilters } from '@/components/crm/LeadFilters'
import { requireUser } from '@/lib/auth'
import { leadName } from '@/lib/format'
import { leadScope } from '@/lib/lead-access'
import { canEditAtStage } from '@/lib/stage-rules'
import { prisma } from '@/lib/prisma'
import { leadScore } from '@/components/crm/crm-utils'
import { buildLeadWhere, parseLeadFilters } from '@/lib/lead-query'
import { PageIntro } from '@/components/PageIntro'

export const metadata = { title: 'Board' }

type SP = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v) || undefined

export default async function BoardPage({ searchParams }: { searchParams: SP }): Promise<React.ReactElement> {
  const user = await requireUser()
  const isAdmin = user.role === 'ADMIN'
  const scope: Prisma.LeadWhereInput = { AND: [leadScope(user), { archived: false }] }
  const f = { q: one(searchParams.q), status: one(searchParams.status), source: one(searchParams.source), owner: one(searchParams.owner) }

  // Filters run in the database, so older contacts are found no matter how many there are.
  const where: Prisma.LeadWhereInput = { AND: [scope, buildLeadWhere(parseLeadFilters({ q: f.q, status: f.status, source: f.source, assignee: f.owner }))] }
  const [leads, reps, sourceRows] = await Promise.all([
    prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, take: 3000, include: { assignedTo: { select: { name: true, email: true } } } }),
    prisma.user.findMany({ where: { role: { in: ['SALES', 'ADMIN'] }, ...(isAdmin ? {} : { id: user.id }) }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }),
    prisma.lead.findMany({ where: scope, distinct: ['source'], select: { source: true }, orderBy: { source: 'asc' } }),
  ])
  const sources = sourceRows.map((r) => r.source)

  return (
    <div>
      <PageIntro title="Board" hint="Your pipeline as cards. Drag a card to the next stage as the deal moves (on a phone, use the menu on each card)." className="mb-4" />
      <LeadFilters
        action="/sales/board"
        values={f}
        sources={sources}
        reps={reps.map((r) => ({ id: r.id, label: r.name ?? r.email ?? r.id }))}
        exportHref={`/sales/export?${new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString()}`}
      />
      <p className="mb-3 text-xs text-muted-foreground">
        {leads.length} contact{leads.length === 1 ? '' : 's'}{isAdmin ? '' : ' · you can move the cards you own'}
      </p>
      <KanbanBoard
        isAdmin={isAdmin}
        leads={leads.map((l) => ({
          id: l.id,
          name: leadName(l),
          company: l.company,
          email: l.email,
          owner: l.assignedTo ? (l.assignedTo.name ?? l.assignedTo.email) : null,
          budget: l.budget,
          dealValue: l.dealValue,
          score: leadScore(l),
          status: l.status,
          canMove: isAdmin || (l.assignedToId === user.id && canEditAtStage(user.role, l.status)),
        }))}
      />
    </div>
  )
}
