import type { LeadStatus, Prisma } from '@prisma/client'

export const PAGE_SIZE = 25
const STATUSES: readonly string[] = ['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'PROPOSAL_SENT', 'WON', 'LOST']

export interface LeadFilters {
  q?: string
  status?: LeadStatus
  /** user id, or "none" for unassigned */
  assignee?: string
  source?: string
  tag?: string
  archived?: boolean
  page: number
}

type Params = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v)?.trim() || undefined

/** Parse untrusted URL search params into a safe filter object. */
export function parseLeadFilters(params: Params): LeadFilters {
  const status = one(params.status)
  const page = Number.parseInt(one(params.page) ?? '1', 10)
  return {
    q: one(params.q)?.slice(0, 100),
    status: status && STATUSES.includes(status) ? (status as LeadStatus) : undefined,
    assignee: one(params.assignee)?.slice(0, 40),
    source: one(params.source)?.slice(0, 100),
    tag: one(params.tag)?.toLowerCase().slice(0, 40),
    archived: one(params.archived) === '1',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

export function buildLeadWhere(f: LeadFilters): Prisma.LeadWhereInput {
  const and: Prisma.LeadWhereInput[] = [{ archived: f.archived ?? false }]
  if (f.q) {
    // Every word must match some field, so "Dana Levi" or "levi acme" find the right person.
    for (const word of f.q.split(/\s+/).filter(Boolean).slice(0, 5)) {
      const c = { contains: word, mode: 'insensitive' as const }
      and.push({ OR: [{ email: c }, { firstName: c }, { lastName: c }, { company: c }, { phone: c }] })
    }
  }
  if (f.status) and.push({ status: f.status })
  if (f.assignee === 'none') and.push({ assignedToId: null })
  else if (f.assignee) and.push({ assignedToId: f.assignee })
  if (f.source) and.push({ source: f.source })
  if (f.tag) and.push({ tags: { has: f.tag } })
  return { AND: and }
}

/** Conversion = WON / (WON + LOST + open) as a percentage with one decimal; 0 when empty. */
export function conversionRate(won: number, total: number): number {
  return total > 0 ? Math.round((won / total) * 1000) / 10 : 0
}

const csvCell = (v: unknown): string => {
  let s = v == null ? '' : v instanceof Date ? v.toISOString() : String(v)
  // Neutralise spreadsheet formula injection
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
}
