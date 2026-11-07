'use server'

import { LeadSourceType, Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { requireUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { type CommissionTerms, dealTerms, parseTerms } from '@/lib/commission'
import { setQuotedPrice, snapshotWonCommission, termsForAssignee } from '@/lib/deals'
import { prisma } from '@/lib/prisma'
import { toActionError, type ActionResult } from './result'

/** Everything in here is ADMIN only. Salespeople never reach these actions (and never receive prices or terms). */

const leadId = z.string().cuid()
const money = z.number().int().min(0).max(1_000_000_000)
const pct = z.number().min(0).max(100)

const termsSchema = z.object({ baseRatePct: pct, threshold: money, incrementSize: money, bonusPerIncrement: money })

function refresh(id: string): void {
  revalidatePath(`/sales/leads/${id}`)
  revalidatePath('/sales', 'layout')
  revalidatePath('/admin/dashboard')
}

/** The terms that apply to one deal right now: the salesperson's saved terms with this deal's overrides on top. */
export async function getDealCommissionTerms(id: string): Promise<ActionResult<{ terms: CommissionTerms; saved: CommissionTerms; overridden: boolean; salesperson: string | null }>> {
  try {
    await requireUser(['ADMIN'])
    const lead = await prisma.lead.findUnique({ where: { id: leadId.parse(id) }, select: { assignedToId: true, commissionOverrides: true, assignedTo: { select: { name: true, email: true } } } })
    if (!lead) throw new BookingError('Lead not found.', 'NOT_FOUND')
    const saved = await termsForAssignee(lead.assignedToId)
    return { ok: true, data: { terms: dealTerms(saved, lead.commissionOverrides), saved, overridden: lead.commissionOverrides !== null, salesperson: lead.assignedTo ? (lead.assignedTo.name ?? lead.assignedTo.email) : null } }
  } catch (err) {
    return toActionError(err)
  }
}

/** Set or clear the price agreed with the client. Quoting a price moves an earlier-stage lead to Proposal sent. On a won deal it refreshes the frozen commission (unless client money is already in). */
export async function saveQuotedPrice(id: string, price: number | null): Promise<ActionResult<{ movedToProposal: boolean }>> {
  try {
    const admin = await requireUser(['ADMIN'])
    const lid = leadId.parse(id)
    const value = price === null ? null : money.parse(price)
    if (value === null || value <= 0) {
      const cur = await prisma.lead.findUnique({ where: { id: lid }, select: { status: true, finalPaymentReceivedAt: true, finalPaidAt: true } })
      if (cur?.status === 'WON' && (cur.finalPaymentReceivedAt || cur.finalPaidAt)) {
        throw new BookingError('The client’s payment or the commission payout is already recorded for this deal, so its price can’t be cleared.', 'INVALID_STATE')
      }
    }
    const result = await prisma.$transaction((tx) => setQuotedPrice(lid, value, admin.id, tx))
    refresh(lid)
    return { ok: true, data: { movedToProposal: result.movedToProposal } }
  } catch (err) {
    return toActionError(err)
  }
}

/** Per-deal overrides of the commission terms. `null` goes back to the salesperson's saved terms. Never changes those. */
export async function saveCommissionOverrides(id: string, overrides: CommissionTerms | null): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const lid = leadId.parse(id)
    const value = overrides === null ? null : termsSchema.parse(overrides)
    await prisma.$transaction(async (tx) => {
      await tx.lead.update({ where: { id: lid }, data: { commissionOverrides: value === null ? Prisma.DbNull : { ...value } } })
      await logActivity({ entityType: 'LEAD', entityId: lid, action: 'lead.commission_overridden', actorId: admin.id, metadata: value ? { ...value } : { cleared: true } }, tx)
      await snapshotWonCommission(lid, tx)
    })
    refresh(lid)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Recompute a won deal's frozen commission from the current terms/overrides and price (the one explicit way to change it). */
export async function recalculateWonCommission(id: string): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const lid = leadId.parse(id)
    const lead = await prisma.lead.findUnique({ where: { id: lid }, select: { status: true, quotedPrice: true, finalPaidAt: true } })
    if (!lead || lead.status !== 'WON') throw new BookingError('Only a won deal has a frozen commission.', 'INVALID_STATE')
    if (lead.finalPaidAt) throw new BookingError('This commission was already paid out. Undo the payout first if it really has to change.', 'INVALID_STATE')
    if (!lead.quotedPrice) throw new BookingError('Enter the quoted price first.', 'INVALID_STATE')
    await prisma.$transaction(async (tx) => {
      await snapshotWonCommission(lid, tx, { force: true })
      await logActivity({ entityType: 'LEAD', entityId: lid, action: 'lead.commission_recalculated', actorId: admin.id }, tx)
    })
    refresh(lid)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

const paymentSchema = z.object({
  /** received = the client paid us; paid = we paid the salesperson their commission */
  kind: z.enum(['received', 'paid']),
  /** YYYY-MM-DD, or null to undo */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
})

/** Mark the client's payment as received (with its date), or the commission as paid out, or undo either. */
export async function setCommissionPayment(id: string, input: z.input<typeof paymentSchema>): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const lid = leadId.parse(id)
    const m = paymentSchema.parse(input)
    const lead = await prisma.lead.findUnique({ where: { id: lid }, select: { status: true, commissionTotal: true, finalPaymentReceivedAt: true, finalPaidAt: true, refundedAt: true, assignedTo: { select: { email: true } } } })
    if (!lead || lead.status !== 'WON' || lead.commissionTotal === null) throw new BookingError('Win the deal and enter its price first: that is when the commission is set.', 'INVALID_STATE')
    const date = m.date ? new Date(`${m.date}T12:00:00Z`) : null
    // "2026-02-31" passes a pattern check but is not a day: reject it instead of letting the database throw.
    if (m.date && (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== m.date)) throw new BookingError('That date does not exist. Pick a real date.', 'INVALID_STATE')
    if (m.kind === 'paid' && date && lead.refundedAt) throw new BookingError('The client’s money was returned, so this commission is cancelled. Undo the refund first if that was a mistake.', 'INVALID_STATE')
    if (m.kind === 'paid' && date && lead.finalPaymentReceivedAt && lead.assignedTo?.email) {
      const ended = await prisma.allowedUser.findUnique({ where: { email: lead.assignedTo.email }, select: { terminatedAt: true } })
      if (ended?.terminatedAt && lead.finalPaymentReceivedAt > ended.terminatedAt) throw new BookingError('The salesperson’s agreement ended before the client paid, so no commission is owed on this deal.', 'INVALID_STATE')
    }
    if (m.kind === 'paid' && date && lead.finalPaymentReceivedAt && date < lead.finalPaymentReceivedAt) throw new BookingError('The payout date can’t be before the day the client paid.', 'INVALID_STATE')
    if (m.kind === 'paid' && date && !lead.finalPaymentReceivedAt) {
      throw new BookingError('Nothing is payable before the client’s money is collected. Mark the payment as received first.', 'INVALID_STATE')
    }
    if (m.kind === 'received' && !date && lead.finalPaidAt) {
      throw new BookingError('The salesperson was already paid. Undo the payout first.', 'INVALID_STATE')
    }
    const field = m.kind === 'received' ? 'finalPaymentReceivedAt' : 'finalPaidAt'
    await prisma.$transaction(async (tx) => {
      await tx.lead.update({ where: { id: lid }, data: { [field]: date } })
      await logActivity({ entityType: 'LEAD', entityId: lid, action: 'lead.commission_payment', actorId: admin.id, metadata: { kind: m.kind, date: m.date } }, tx)
    })
    refresh(lid)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

export async function setLeadSourceType(id: string, sourceType: LeadSourceType): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const lid = leadId.parse(id)
    const value = z.nativeEnum(LeadSourceType).parse(sourceType)
    await prisma.$transaction(async (tx) => {
      await tx.lead.update({ where: { id: lid }, data: { sourceType: value } })
      await logActivity({ entityType: 'LEAD', entityId: lid, action: 'lead.source_type_changed', actorId: admin.id, metadata: { to: value } }, tx)
    })
    refresh(lid)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** A salesperson's agreed terms, edited by admins on their profile. `null` resets them to the defaults. */
export async function saveSalespersonTerms(userId: string, terms: CommissionTerms | null): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const uid = z.string().cuid().parse(userId)
    const value = terms === null ? null : parseTerms(termsSchema.parse(terms))
    const user = await prisma.user.findUnique({ where: { id: uid }, select: { email: true } })
    if (!user?.email) throw new BookingError('Teammate not found.', 'NOT_FOUND')
    await prisma.$transaction(async (tx) => {
      await tx.allowedUser.update({ where: { email: user.email! }, data: { commissionTerms: value === null ? Prisma.DbNull : { ...value } } })
      await logActivity({ entityType: 'USER', entityId: uid, action: 'user.commission_terms_changed', actorId: admin.id, metadata: value ? { ...value } : { reset: true } }, tx)
    })
    revalidatePath(`/admin/team/${uid}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

const realDate = (v: string | null): Date | null => {
  if (!v) return null
  const d = new Date(`${v}T12:00:00Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) throw new BookingError('That date does not exist. Pick a real date.', 'INVALID_STATE')
  return d
}
const dateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()

/** Hosting, taxes and out-of-pocket costs taken off the price before commission. Locked once the client's money is recorded, like the price. */
export async function saveExcludedCosts(id: string, amount: number | null): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const lid = leadId.parse(id)
    const value = amount === null || amount === 0 ? null : money.parse(amount)
    const cur = await prisma.lead.findUnique({ where: { id: lid }, select: { status: true, quotedPrice: true, finalPaymentReceivedAt: true, excludedCosts: true } })
    if (!cur) throw new BookingError('Lead not found.', 'NOT_FOUND')
    if (cur.finalPaymentReceivedAt) throw new BookingError('The client’s payment is already recorded, so the commission base can’t change. Undo the payment first.', 'INVALID_STATE')
    if (value !== null && cur.quotedPrice !== null && value >= cur.quotedPrice) throw new BookingError('The excluded costs must be less than the price.', 'INVALID_STATE')
    await prisma.$transaction(async (tx) => {
      await tx.lead.update({ where: { id: lid }, data: { excludedCosts: value } })
      await logActivity({ entityType: 'LEAD', entityId: lid, action: 'lead.excluded_costs_changed', actorId: admin.id, metadata: { from: cur.excludedCosts, to: value } }, tx)
      await snapshotWonCommission(lid, tx)
    })
    refresh(lid)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** The client's money was returned (refund, default or dispute). Cancels an unpaid commission; a paid one becomes an overpayment to claw back. `null` undoes it. */
export async function setDealRefund(id: string, date: string | null): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const lid = leadId.parse(id)
    const d = realDate(dateInput.parse(date))
    const lead = await prisma.lead.findUnique({ where: { id: lid }, select: { status: true, finalPaymentReceivedAt: true } })
    if (!lead || lead.status !== 'WON') throw new BookingError('Only a won deal can be refunded.', 'INVALID_STATE')
    if (d && !lead.finalPaymentReceivedAt) throw new BookingError('The client has not paid yet, so there is nothing to refund. The commission simply stays unpaid.', 'INVALID_STATE')
    if (d && lead.finalPaymentReceivedAt && d < lead.finalPaymentReceivedAt) throw new BookingError('The refund can’t be before the day the client paid.', 'INVALID_STATE')
    await prisma.$transaction(async (tx) => {
      await tx.lead.update({ where: { id: lid }, data: { refundedAt: d } })
      await logActivity({ entityType: 'LEAD', entityId: lid, action: 'lead.refund_recorded', actorId: admin.id, metadata: { date } }, tx)
    })
    refresh(lid)
    revalidatePath('/admin/payouts')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** The day a salesperson's agreement ended (null = still active). Only deals the client paid for before this day still pay commission. */
export async function setSalespersonTermination(userId: string, date: string | null): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const uid = z.string().cuid().parse(userId)
    const d = realDate(dateInput.parse(date))
    const user = await prisma.user.findUnique({ where: { id: uid }, select: { email: true } })
    if (!user?.email) throw new BookingError('Teammate not found.', 'NOT_FOUND')
    await prisma.$transaction(async (tx) => {
      await tx.allowedUser.update({ where: { email: user.email! }, data: { terminatedAt: d } })
      await logActivity({ entityType: 'USER', entityId: uid, action: 'user.agreement_terminated', actorId: admin.id, metadata: { date } }, tx)
    })
    revalidatePath(`/admin/team/${uid}`)
    revalidatePath('/admin/payouts')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** ADMIN: remove an agreement from a salesperson's documents. */
export async function deleteAgreement(agreementId: string): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const id = z.string().cuid().parse(agreementId)
    const a = await prisma.agreement.findUnique({ where: { id }, select: { userId: true, title: true } })
    if (!a) throw new BookingError('Agreement not found.', 'NOT_FOUND')
    await prisma.$transaction(async (tx) => {
      await tx.agreement.delete({ where: { id } })
      await logActivity({ entityType: 'USER', entityId: a.userId, action: 'agreement.deleted', actorId: admin.id, metadata: { agreementId: id, title: a.title } }, tx)
    })
    revalidatePath(`/admin/team/${a.userId}`)
    revalidatePath('/sales/documents')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}
