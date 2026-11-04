import 'server-only'
import { logActivity } from './audit'
import { BookingError } from './bookings'
import { callBlockedByOwner } from './call-status'
import { convertProspect } from './call-lists'
import { findExistingLead } from './leads'
import { prisma } from './prisma'

type Caller = { id: string; role: 'ADMIN' | 'SALES' | 'MARKETING' }

/**
 * Every outgoing call belongs to a lead. Finds the lead with this phone number (across everyone's leads), or creates one
 * assigned to the caller. A lead that belongs to another salesperson blocks the call; an unassigned one is taken by the caller.
 * Call-list businesses become leads with their full details. Returns the lead to attach to the call.
 */
export async function leadForOutgoingCall(to: string, user: Caller, prospectId?: string | null): Promise<{ id: string; created: boolean }> {
  const found = await prisma.$transaction(async (tx) => {
    // One call to a brand-new number at a time: two agents dialing it together must not create two leads
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'call-lead:' + to.replace(/\D/g, '').slice(-9)}))`
    const existing = await findExistingLead(tx, undefined, to)
    if (existing) {
      if (callBlockedByOwner(existing, user)) {
        const owner = existing.assignedToId ? await tx.user.findUnique({ where: { id: existing.assignedToId }, select: { name: true, email: true } }) : null
        throw new BookingError(`This number is already a lead${owner ? ` assigned to ${owner.name || owner.email}` : ''}, so you can't call it.`, 'FORBIDDEN')
      }
      if (!existing.assignedToId && user.role !== 'MARKETING') {
        await tx.lead.update({ where: { id: existing.id }, data: { assignedToId: user.id } })
        await logActivity({ entityType: 'LEAD', entityId: existing.id, actorId: user.id, action: 'lead.assigned', metadata: { to: user.id, auto: 'call' } }, tx)
      }
      return { id: existing.id, created: false }
    }
    if (prospectId) return null // created below with the business's details
    const lead = await tx.lead.create({ data: { phone: to, source: 'Dialer', sourceDetail: 'Called from the CRM', tags: ['cold-call'], status: 'NEW', assignedToId: user.role === 'MARKETING' ? null : user.id } })
    await logActivity({ entityType: 'LEAD', entityId: lead.id, actorId: user.id, action: 'lead.created', metadata: { source: 'Dialer', auto: 'call' } }, tx)
    return { id: lead.id, created: true }
  })
  if (found) return found
  const r = await convertProspect(prospectId!, user, { status: 'NEW' })
  return { id: r.leadId, created: r.created }
}
