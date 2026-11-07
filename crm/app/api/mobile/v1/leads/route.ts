import { createLead } from '@/app/actions/leads'
import { leadName } from '@/lib/format'
import { leadScope } from '@/lib/lead-access'
import { buildLeadWhere, parseLeadFilters } from '@/lib/lead-query'
import { fromAction, json, mobileUser } from '@/lib/mobile'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
const PAGE = 40

/** The leads this person may see (search, stage filter, paging), newest activity first. */
export async function GET(req: Request): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  const params = Object.fromEntries(new URL(req.url).searchParams)
  const f = parseLeadFilters(params)
  const where = { AND: [buildLeadWhere(f, user.id), leadScope(user)] }
  const [rows, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (f.page - 1) * PAGE,
      take: PAGE,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true, status: true, updatedAt: true, createdAt: true, source: true, assignedTo: { select: { name: true } } },
    }),
    prisma.lead.count({ where }),
  ])
  return json({
    total,
    page: f.page,
    more: f.page * PAGE < total,
    leads: rows.map((l) => ({ id: l.id, name: leadName(l), company: l.company, email: l.email, phone: l.phone, status: l.status, source: l.source, owner: l.assignedTo?.name ?? null, updatedAt: l.updatedAt, createdAt: l.createdAt })),
  })
}

/** A new lead, through the website's own action (same checks, duplicate detection and assignment). */
export async function POST(req: Request): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const s = (k: string): string | undefined => (typeof body[k] === 'string' && (body[k] as string).trim() ? (body[k] as string).trim() : undefined)
  return fromAction(await createLead({ firstName: s('firstName'), lastName: s('lastName'), email: s('email'), phone: s('phone'), company: s('company'), source: 'iOS app' }))
}
