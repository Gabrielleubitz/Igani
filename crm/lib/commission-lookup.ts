import 'server-only'
import { prisma } from './prisma'

export interface AssigneeCommission {
  /** Who the lead belongs to (and so who earns the commission). */
  name: string
  /** Their commission in basis points, or null when an admin hasn't set one. */
  bps: number | null
}

/** The commission rate of the salesman who owns a lead, or null when the lead has no owner. */
export async function assigneeCommission(leadId: string): Promise<AssigneeCommission | null> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { assignedTo: { select: { email: true, name: true } } } })
  const owner = lead?.assignedTo
  if (!owner) return null
  const allowed = owner.email ? await prisma.allowedUser.findUnique({ where: { email: owner.email.toLowerCase() }, select: { commissionBps: true } }) : null
  return { name: owner.name ?? owner.email ?? 'the salesman', bps: allowed?.commissionBps ?? null }
}
