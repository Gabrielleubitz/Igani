import type { Prisma } from '@prisma/client'
import { leadScore } from '@/components/crm/crm-utils'
import { leadName } from '@/lib/format'
import { leadScope } from '@/lib/lead-access'
import { notArchivedBy } from '@/lib/lead-archive'
import { buildLeadWhere, parseLeadFilters } from '@/lib/lead-query'
import { json, mobileUser } from '@/lib/mobile'
import { prisma } from '@/lib/prisma'
import { canEditAtStage } from '@/lib/stage-rules'

export const dynamic = 'force-dynamic'

/** The pipeline as cards per stage (same scope and move rules as the website's Board). */
export async function GET(req: Request): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  const isAdmin = user.role === 'ADMIN'
  const sp = new URL(req.url).searchParams
  const scope: Prisma.LeadWhereInput = { AND: [leadScope(user), notArchivedBy(user.id)] }
  const f = parseLeadFilters({ q: sp.get('q') ?? undefined, assignee: sp.get('owner') ?? undefined })
  const leads = await prisma.lead.findMany({ where: { AND: [scope, buildLeadWhere(f, user.id)] }, orderBy: { updatedAt: 'desc' }, take: 1500, include: { assignedTo: { select: { name: true, email: true } } } })
  return json({
    isAdmin,
    cards: leads.map((l) => ({
      id: l.id,
      name: leadName(l),
      company: l.company,
      phone: l.phone,
      owner: l.assignedTo ? (l.assignedTo.name ?? l.assignedTo.email) : null,
      budget: l.budget,
      quoted: isAdmin ? l.quotedPrice : null,
      score: leadScore(l),
      status: l.status,
      canMove: isAdmin || (l.assignedToId === user.id && canEditAtStage(user.role, l.status)),
      updatedAt: l.updatedAt,
    })),
  })
}
