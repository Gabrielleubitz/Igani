import 'server-only'
import { reassignProblem, type Sourcer } from './lead-protection'
import { prisma } from './prisma'

type Db = Pick<typeof prisma, 'lead' | 'user' | 'allowedUser'>

/** Loads the lead's sourcer and applies the rule: a message when the lead may not move to `to`, else null. */
export async function leadReassignProblem(leadId: string, to: string | null, db: Db = prisma): Promise<string | null> {
  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { sourcedById: true, assignedToId: true } })
  if (!lead?.sourcedById) return null
  if (to === lead.sourcedById) return null
  const user = await db.user.findUnique({ where: { id: lead.sourcedById }, select: { name: true, email: true } })
  const allowed = user?.email ? await db.allowedUser.findUnique({ where: { email: user.email }, select: { active: true, terminatedAt: true } }) : null
  const sourcer: Sourcer | null = user ? { name: user.name ?? user.email ?? 'a teammate', active: allowed?.active ?? true, terminatedAt: allowed?.terminatedAt ?? null } : null
  return reassignProblem(lead, to, sourcer)
}
