import type { Prisma } from '@prisma/client'
import { KanbanBoard } from '@/components/crm/KanbanBoard'
import { LeadFilters } from '@/components/crm/LeadFilters'
import { requireUser } from '@/lib/auth'
import { leadName } from '@/lib/format'
import { leadScope } from '@/lib/lead-access'
import { prisma } from '@/lib/prisma'
import { filterLeads, leadScore } from '@/components/crm/crm-utils'
import { PageIntro } from '@/components/PageIntro'

export const metadata = { title: 'Board' }

type SP = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v) || undefined

export default async function BoardPage({ searchParams }: { searchParams: SP }): Promise<React.ReactElement> {
  const user = await requireUser()
  const isAdmin = user.role === 'ADMIN'
  const scope: Prisma.LeadWhereInput = { AND: [leadScope(user), { archived: false }] }
  const f = { q: one(searchParams.q), status: one(searchParams.status), source: one(searchParams.source), owner: one(searchParams.owner) }

  const [all, reps] = await Promise.all([
    prisma.lead.findMany({ where: scope, orderBy: { createdAt: 'desc' }, take: 2000, include: { assignedTo: { select: { name: true, email: true } } } }),
    prisma.user.findMany({ where: { role: { in: ['SALES', 'ADMIN'] } }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }),
  ])
  const leads = filterLeads(all, f)
  const sources = [...new Set(all.map((l) => l.source))].sort()

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
          canMove: isAdmin || l.assignedToId === user.id,
        }))}
      />
    </div>
  )
}
