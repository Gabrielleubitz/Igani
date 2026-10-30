import type { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { filterLeads, toCsv } from '@/components/crm/crm-utils'
import { logActivity } from '@/lib/audit'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** CSV export of leads the caller may see, honouring the same filters as the board. */
export async function GET(req: Request): Promise<Response> {
  const user = await requireUser(['ADMIN', 'SALES'])
  const p = new URL(req.url).searchParams
  const f = { q: p.get('q') ?? undefined, status: p.get('status') ?? undefined, source: p.get('source') ?? undefined, owner: p.get('owner') ?? undefined }
  const scope: Prisma.LeadWhereInput = user.role === 'ADMIN' ? {} : { OR: [{ assignedToId: user.id }, { assignedToId: null }] }
  const all = await prisma.lead.findMany({ where: scope, orderBy: { createdAt: 'desc' }, include: { assignedTo: { select: { name: true, email: true } } } })
  const leads = filterLeads(all, f)
  const csv = toCsv(
    ['Email', 'First name', 'Last name', 'Phone', 'Company', 'Website', 'Status', 'Source', 'UTM campaign', 'Budget', 'Owner', 'Message', 'Created'],
    leads.map((l) => [l.email, l.firstName, l.lastName, l.phone, l.company, l.website, l.status, l.source, l.utmCampaign, l.budget, l.assignedTo?.name ?? l.assignedTo?.email, l.message, l.createdAt]),
  )
  await logActivity({ entityType: 'LEAD', entityId: 'export', actorId: user.id, action: 'leads.exported', metadata: { count: leads.length } })
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="igani-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
