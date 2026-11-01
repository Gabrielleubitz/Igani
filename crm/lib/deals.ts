import 'server-only'
import type { Prisma } from '@prisma/client'
import { calculateCommission, dealTerms, parseTerms, type CommissionTerms } from './commission'
import { prisma } from './prisma'

type Db = Prisma.TransactionClient | typeof prisma

/** The salesperson's saved terms (null = the defaults) for whoever owns a lead. */
export async function termsForAssignee(assignedToId: string | null, db: Db = prisma): Promise<CommissionTerms> {
  if (!assignedToId) return parseTerms(null)
  const user = await db.user.findUnique({ where: { id: assignedToId }, select: { email: true } })
  const allowed = user?.email ? await db.allowedUser.findUnique({ where: { email: user.email }, select: { commissionTerms: true } }) : null
  return parseTerms(allowed?.commissionTerms)
}

/**
 * Freezes the commission for a won deal: the terms used (salesperson's, plus this deal's overrides), the breakdown and the
 * two milestone amounts. The terms come from the salesperson's saved terms the first time; after that the frozen terms are
 * reused (so editing the price or this deal's overrides never pulls in terms the salesperson was given LATER). Only an
 * explicit recalculation (`force`) reads the salesperson's current terms again. Does nothing without a quoted price, and
 * leaves a deal alone once any client money has been collected for it unless forced.
 */
export async function snapshotWonCommission(leadId: string, db: Db = prisma, opts: { force?: boolean } = {}): Promise<void> {
  const lead = await db.lead.findUniqueOrThrow({
    where: { id: leadId },
    select: { status: true, quotedPrice: true, assignedToId: true, commissionOverrides: true, commissionSnapshot: true, downpaymentReceivedAt: true, finalPaymentReceivedAt: true },
  })
  if (lead.status !== 'WON' || !lead.quotedPrice || lead.quotedPrice <= 0) return
  if (!opts.force && (lead.downpaymentReceivedAt || lead.finalPaymentReceivedAt)) return
  const frozen = (lead.commissionSnapshot as { terms?: unknown } | null)?.terms
  const base = !opts.force && frozen ? parseTerms(frozen) : await termsForAssignee(lead.assignedToId, db)
  const terms = dealTerms(base, lead.commissionOverrides)
  const c = calculateCommission(lead.quotedPrice, terms)
  await db.lead.update({
    where: { id: leadId },
    data: {
      commissionSnapshot: { terms: { ...terms }, breakdown: { ...c }, quotedPrice: lead.quotedPrice, overridden: lead.commissionOverrides !== null, snapshotAt: new Date().toISOString() },
      commissionTotal: c.total,
      commissionDownpayment: c.downpayment,
      commissionFinal: c.final,
    },
  })
}
