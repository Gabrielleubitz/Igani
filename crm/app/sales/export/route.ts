import type { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { toCsv } from '@/components/crm/crm-utils'
import { buildLeadWhere, parseLeadFilters } from '@/lib/lead-query'
import { logActivity } from '@/lib/audit'
import { requireUser } from '@/lib/auth'
import { notArchivedBy } from '@/lib/lead-archive'
import { leadScope } from '@/lib/lead-access'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** CSV export of leads, honouring the same filters as the board. Admins only. */
export async function GET(req: Request): Promise<Response> {
  const user = await requireUser(['ADMIN'])
  const p = new URL(req.url).searchParams
  const f = { q: p.get('q') ?? undefined, status: p.get('status') ?? undefined, source: p.get('source') ?? undefined, owner: p.get('owner') ?? undefined }
  const scope: Prisma.LeadWhereInput = { AND: [leadScope(user), notArchivedBy(user.id)] }
  const leads = await prisma.lead.findMany({
    where: { AND: [scope, buildLeadWhere(parseLeadFilters({ q: f.q, status: f.status, source: f.source, assignee: f.owner }), user.id)] },
    orderBy: { createdAt: 'desc' },
    take: 50_000,
    include: { assignedTo: { select: { name: true, email: true } } },
  })
  const csv = toCsv(
    ['Email', 'First name', 'Last name', 'Phone', 'Company', 'Website', 'Stage', 'Lead source', 'Source detail', 'UTM campaign', 'Budget', ...(user.role === 'ADMIN' ? ['Quoted price'] : []), 'Tags', 'Owner', 'Message', 'Created'],
    leads.map((l) => [l.email, l.firstName, l.lastName, l.phone, l.company, l.website, l.status, l.source, l.sourceDetail, l.utmCampaign, l.budget, ...(user.role === 'ADMIN' ? [l.quotedPrice] : []), l.tags.join(';'), l.assignedTo?.name ?? l.assignedTo?.email, l.message, l.createdAt]),
  )
  await logActivity({ entityType: 'LEAD', entityId: 'export', actorId: user.id, action: 'leads.exported', metadata: { count: leads.length } })
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="igani-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
