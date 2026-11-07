import { EARLY_STATUSES } from './call-status'
import 'server-only'
import { Prisma } from '@prisma/client'
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

/** Stages before "Proposal sent": quoting a price puts the lead on the Proposal sent stage. */
const BEFORE_PROPOSAL = [...EARLY_STATUSES, 'DEMO_SCHEDULED', 'DEMO_SENT'] as const

/**
 * Sets (or clears) the quoted price. Quoting a price on a lead that is still earlier in the pipeline moves it to
 * "Proposal sent", since a quote is a proposal. Won and Lost leads, and ones already at Proposal sent, stay where they are.
 * Refreshes a won deal's frozen commission when the price changes.
 */
export async function setQuotedPrice(leadId: string, price: number | null, actorId: string, db: Prisma.TransactionClient): Promise<{ changed: boolean; movedToProposal: boolean }> {
  const before = await db.lead.findUniqueOrThrow({ where: { id: leadId }, select: { quotedPrice: true, status: true } })
  if (before.quotedPrice === price) return { changed: false, movedToProposal: false }
  const move = price !== null && price > 0 && (BEFORE_PROPOSAL as readonly string[]).includes(before.status)
  // Clearing the price of a won deal clears its commission too (no stale amount left owing); the caller has already refused
  // this once client money or a payout is recorded.
  const clearsCommission = before.status === 'WON' && (price === null || price <= 0)
  await db.lead.update({
    where: { id: leadId },
    data: { quotedPrice: price, ...(move ? { status: 'PROPOSAL_SENT' } : {}), ...(clearsCommission ? { commissionTotal: null, commissionSnapshot: Prisma.DbNull } : {}) },
  })
  await db.activityLog.create({ data: { entityType: 'LEAD', entityId: leadId, action: 'lead.price_changed', actorId, metadata: { from: before.quotedPrice, to: price } } })
  if (move) {
    await db.activityLog.create({ data: { entityType: 'LEAD', entityId: leadId, action: 'lead.status_changed', actorId, metadata: { from: before.status, to: 'PROPOSAL_SENT', quotedPrice: price, auto: 'quoted-price' } } })
  }
  await snapshotWonCommission(leadId, db)
  return { changed: true, movedToProposal: move }
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
    select: { status: true, quotedPrice: true, excludedCosts: true, assignedToId: true, commissionOverrides: true, commissionSnapshot: true, finalPaymentReceivedAt: true, payments: { select: { id: true }, take: 1 } },
  })
  if (lead.status !== 'WON' || !lead.quotedPrice || lead.quotedPrice <= 0) return
  if (!opts.force && (lead.payments.length || lead.finalPaymentReceivedAt)) return
  const frozen = (lead.commissionSnapshot as { terms?: unknown } | null)?.terms
  const base = !opts.force && frozen ? parseTerms(frozen) : await termsForAssignee(lead.assignedToId, db)
  const terms = dealTerms(base, lead.commissionOverrides)
  const c = calculateCommission(lead.quotedPrice, terms, lead.excludedCosts ?? 0)
  await db.lead.update({
    where: { id: leadId },
    data: {
      commissionSnapshot: { terms: { ...terms }, breakdown: { ...c }, quotedPrice: lead.quotedPrice, excludedCosts: lead.excludedCosts ?? 0, overridden: lead.commissionOverrides !== null, snapshotAt: new Date().toISOString() },
      commissionTotal: c.total,
    },
  })
}

/**
 * After an admin reassigns a won deal: recalculate its commission with the NEW rep's terms, or set a custom amount.
 * (Keeping the old amount needs no change.) Never touches a commission that was already paid out.
 */
export async function applyCommissionChoice(leadId: string, mode: 'recalculate' | 'custom', amount: number | undefined, actorId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUniqueOrThrow({ where: { id: leadId }, select: { commissionSnapshot: true, finalPaidAt: true } })
    if (lead.finalPaidAt) throw new Error('commission already paid out')
    if (mode === 'recalculate') {
      await snapshotWonCommission(leadId, tx, { force: true })
    } else {
      const snap = (lead.commissionSnapshot ?? {}) as Record<string, unknown>
      await tx.lead.update({ where: { id: leadId }, data: { commissionTotal: amount ?? 0, commissionSnapshot: { ...snap, custom: true, customTotal: amount ?? 0, snapshotAt: new Date().toISOString() } } })
    }
    await tx.activityLog.create({ data: { entityType: 'LEAD', entityId: leadId, action: 'lead.commission_changed_on_reassign', actorId, metadata: { mode, ...(mode === 'custom' ? { amount } : {}) } } })
  })
}
