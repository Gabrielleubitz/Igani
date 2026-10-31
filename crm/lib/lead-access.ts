import 'server-only'
import type { Prisma } from '@prisma/client'
import type { SessionUser } from './auth'
import { visibleLeadsWhere } from '@/components/crm/crm-utils'
import { BookingError } from './bookings'
import { prisma } from './prisma'

/**
 * One rule for every page and action:
 *  - ADMIN sees and edits every contact.
 *  - Everyone else sees their own contacts plus unassigned ones (so they can claim them).
 *  - Changing the pipeline stage needs ownership (SALES must claim first); ADMIN always may.
 */
export function leadScope(user: Pick<SessionUser, 'id' | 'role'>): Prisma.LeadWhereInput {
  return visibleLeadsWhere(user.role, user.id)
}

export function canSeeLead(user: Pick<SessionUser, 'id' | 'role'>, lead: { assignedToId: string | null }): boolean {
  return user.role === 'ADMIN' || lead.assignedToId === null || lead.assignedToId === user.id
}

/** Throws NOT_FOUND unless the lead exists and the user may see it. Returns the owner id. */
export async function assertCanSeeLead(leadId: string, user: Pick<SessionUser, 'id' | 'role'>): Promise<{ assignedToId: string | null }> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { assignedToId: true } })
  if (!lead || !canSeeLead(user, lead)) throw new BookingError('Contact not found.', 'NOT_FOUND')
  return lead
}

/** Throws unless the user may change the stage of this lead. */
export async function assertCanMoveLead(leadId: string, user: Pick<SessionUser, 'id' | 'role'>): Promise<void> {
  const lead = await assertCanSeeLead(leadId, user)
  if (user.role === 'ADMIN') return
  if (lead.assignedToId !== user.id) {
    throw new BookingError(lead.assignedToId ? 'This contact belongs to another teammate.' : 'Claim this contact before changing its stage.', 'FORBIDDEN')
  }
}

/** Ids from `ids` the user may see; throws if any are hidden (so bulk actions are all-or-nothing). */
export async function assertCanSeeLeads(ids: string[], user: Pick<SessionUser, 'id' | 'role'>, mustOwn = false): Promise<void> {
  if (user.role === 'ADMIN') return
  const rows = await prisma.lead.findMany({ where: { id: { in: ids } }, select: { assignedToId: true } })
  const ok = rows.length === ids.length && rows.every((l) => (mustOwn ? l.assignedToId === user.id : canSeeLead(user, l)))
  if (!ok) throw new BookingError(mustOwn ? 'You can only change the stage of contacts you own.' : 'Some selected contacts are not yours.', 'FORBIDDEN')
}
