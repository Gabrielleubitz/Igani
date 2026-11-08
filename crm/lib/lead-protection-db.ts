import 'server-only'
import { reassignProblem, type Person } from './lead-protection'
import { prisma } from './prisma'

type Db = Pick<typeof prisma, 'lead' | 'user' | 'allowedUser'>

async function personOf(db: Db, userId: string | null): Promise<Person | null> {
  if (!userId) return null
  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
  if (!user) return null
  const allowed = user.email ? await db.allowedUser.findUnique({ where: { email: user.email }, select: { active: true, terminatedAt: true } }) : null
  return { name: user.name ?? user.email ?? 'a teammate', active: allowed?.active ?? true, terminatedAt: allowed?.terminatedAt ?? null }
}

/** Loads the people involved and applies the rule: a message when the lead may not move to `to`, else null. */
export async function leadReassignProblem(leadId: string, to: string | null, db: Db = prisma): Promise<string | null> {
  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { sourcedById: true, assignedToId: true, status: true } })
  if (!lead) return null
  if (!lead.sourcedById && !(lead.assignedToId && ['SIGNED', 'WON'].includes(lead.status))) return null
  const [sourcer, assignee] = await Promise.all([personOf(db, lead.sourcedById), personOf(db, lead.assignedToId)])
  return reassignProblem(lead, to, sourcer, assignee)
}
