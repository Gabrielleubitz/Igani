'use server'

import { LeadSourceType, Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { requireUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { type CommissionTerms, bonusDue, dealTerms, parseTerms, paymentCommission } from '@/lib/commission'
import { setQuotedPrice, snapshotWonCommission, termsForAssignee } from '@/lib/deals'
import { LOCKED_MESSAGE, termsLockedBy } from '@/lib/commission-lock'
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
    const cur = await prisma.lead.findUnique({ where: { id: lid }, select: { status: true, quotedPrice: true, finalPaidAt: true, finalPaymentReceivedAt: true, payments: { select: { id: true }, take: 1 } } })
    if (cur?.status === 'WON' && cur.quotedPrice !== value && (cur.payments.length || cur.finalPaidAt || cur.finalPaymentReceivedAt)) {
      throw new BookingError('A client payment or a payout is already recorded for this deal, so its price can’t be changed. Remove the payments first.', 'INVALID_STATE')
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
    // A deal's terms follow the signed agreement: no per-deal changes once the salesperson has signed
    if (value !== null) {
      const owner = await prisma.lead.findUnique({ where: { id: lid }, select: { assignedTo: { select: { email: true } } } })
      if (await termsLockedBy(owner?.assignedTo?.email)) throw new BookingError(LOCKED_MESSAGE, 'INVALID_STATE')
    }
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
    const lead = await prisma.lead.findUnique({ where: { id: lid }, select: { status: true, quotedPrice: true, finalPaidAt: true, payments: { select: { id: true }, take: 1 } } })
    if (!lead || lead.status !== 'WON') throw new BookingError('Only a won deal has a frozen commission.', 'INVALID_STATE')
    if (lead.finalPaidAt || lead.payments.length) throw new BookingError('A client payment is already recorded, and each payment’s commission was fixed when it was entered. Remove the payments first if the commission really has to change.', 'INVALID_STATE')
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

const dateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const realDate = (v: string | null): Date | null => {
  if (!v) return null
  const d = new Date(`${v}T12:00:00Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) throw new BookingError('That date does not exist. Pick a real date.', 'INVALID_STATE')
  return d
}

type Tx = Prisma.TransactionClient

/** Sets finalPaymentReceivedAt to the day the whole price was paid (net of refunds), or clears it when the price is no longer fully paid. */
async function syncFullyPaid(tx: Tx, leadId: string): Promise<void> {
  const lead = await tx.lead.findUniqueOrThrow({ where: { id: leadId }, select: { quotedPrice: true, finalPaymentReceivedAt: true, payments: { select: { amount: true, receivedAt: true, refundedAt: true } } } })
  const live = lead.payments.filter((p) => !p.refundedAt)
  const net = live.reduce((n, p) => n + p.amount, 0)
  const full = bonusDue(net, lead.quotedPrice ?? 0)
  const last = live.reduce<Date | null>((m, p) => (!m || p.receivedAt > m ? p.receivedAt : m), null)
  const next = full ? last : null
  if ((next?.getTime() ?? null) !== (lead.finalPaymentReceivedAt?.getTime() ?? null)) await tx.lead.update({ where: { id: leadId }, data: { finalPaymentReceivedAt: next } })
}

/** Does this salesperson's agreement end before the given day? Then a payment received after it earns no commission. */
async function endedBefore(tx: Tx, leadId: string, day: Date): Promise<boolean> {
  const l = await tx.lead.findUnique({ where: { id: leadId }, select: { assignedTo: { select: { email: true } } } })
  if (!l?.assignedTo?.email) return false
  const ended = await tx.allowedUser.findUnique({ where: { email: l.assignedTo.email }, select: { terminatedAt: true } })
  return !!ended?.terminatedAt && day > ended.terminatedAt
}

const paymentInput = z.object({ amount: z.number().int().positive().max(1_000_000_000), date: dateInput })

/** The client made a payment (any part of the price). Its commission is worked out and is payable straight away. */
export async function addLeadPayment(id: string, input: z.input<typeof paymentInput>): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const lid = leadId.parse(id)
    const m = paymentInput.parse(input)
    const date = realDate(m.date)!
    await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({ where: { id: lid }, select: { status: true, quotedPrice: true, excludedCosts: true, commissionTotal: true, commissionSnapshot: true, payments: { select: { amount: true, refundedAt: true } } } })
      if (!lead || lead.status !== 'WON' || lead.commissionTotal === null || !lead.quotedPrice) throw new BookingError('Win the deal and enter its price first: that is when the commission is set.', 'INVALID_STATE')
      const paidBefore = lead.payments.filter((p) => !p.refundedAt).reduce((n, p) => n + p.amount, 0)
      if (paidBefore + m.amount > lead.quotedPrice) throw new BookingError(`That is more than the price. ${Math.max(0, lead.quotedPrice - paidBefore).toLocaleString('en-US')} is still to be paid.`, 'INVALID_STATE')
      const rate = parseTerms((lead.commissionSnapshot as { terms?: unknown } | null)?.terms).baseRatePct
      const commission = paymentCommission(m.amount, paidBefore, lead.quotedPrice, lead.excludedCosts ?? 0, rate)
      await tx.leadPayment.create({ data: { leadId: lid, amount: m.amount, receivedAt: date, commission } })
      await syncFullyPaid(tx, lid)
      await logActivity({ entityType: 'LEAD', entityId: lid, action: 'lead.payment_added', actorId: admin.id, metadata: { amount: m.amount, date: m.date, commission } }, tx)
    })
    refresh(lid)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Remove a payment entered by mistake. Only the latest one, and only while its commission has not been paid out. */
export async function deleteLeadPayment(paymentId: string): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const pid = z.string().cuid().parse(paymentId)
    let lid = ''
    await prisma.$transaction(async (tx) => {
      const pay = await tx.leadPayment.findUnique({ where: { id: pid }, select: { leadId: true, commissionPaidAt: true, createdAt: true, amount: true } })
      if (!pay) throw new BookingError('Payment not found.', 'NOT_FOUND')
      lid = pay.leadId
      const newer = await tx.leadPayment.count({ where: { leadId: lid, createdAt: { gt: pay.createdAt } } })
      const lead = await tx.lead.findUniqueOrThrow({ where: { id: lid }, select: { finalPaidAt: true } })
      if (pay.commissionPaidAt) throw new BookingError('The commission on this payment was already paid out. Undo that first.', 'INVALID_STATE')
      if (newer > 0) throw new BookingError('Remove the later payments first, newest first.', 'INVALID_STATE')
      if (lead.finalPaidAt) throw new BookingError('The bonus was already paid out. Undo that first.', 'INVALID_STATE')
      await tx.leadPayment.delete({ where: { id: pid } })
      await syncFullyPaid(tx, lid)
      await logActivity({ entityType: 'LEAD', entityId: lid, action: 'lead.payment_removed', actorId: admin.id, metadata: { amount: pay.amount } }, tx)
    })
    refresh(lid)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** The commission on one payment was paid out to the salesperson (or undo it with null). */
export async function setPaymentCommissionPaid(paymentId: string, date: string | null): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const pid = z.string().cuid().parse(paymentId)
    const d = realDate(date === null ? null : dateInput.parse(date))
    let lid = ''
    await prisma.$transaction(async (tx) => {
      const pay = await tx.leadPayment.findUnique({ where: { id: pid }, select: { leadId: true, receivedAt: true, refundedAt: true } })
      if (!pay) throw new BookingError('Payment not found.', 'NOT_FOUND')
      lid = pay.leadId
      if (d) {
        if (pay.refundedAt) throw new BookingError('This payment was returned to the client, so its commission is cancelled. Undo the refund first if that was a mistake.', 'INVALID_STATE')
        if (d < pay.receivedAt) throw new BookingError('The payout date can’t be before the day the client paid.', 'INVALID_STATE')
        if (await endedBefore(tx, lid, pay.receivedAt)) throw new BookingError('The salesperson’s agreement ended before this payment arrived, so no commission is owed on it.', 'INVALID_STATE')
      }
      await tx.leadPayment.update({ where: { id: pid }, data: { commissionPaidAt: d } })
      await logActivity({ entityType: 'LEAD', entityId: lid, action: 'lead.commission_payment', actorId: admin.id, metadata: { payment: pid, date } }, tx)
    })
    refresh(lid)
    revalidatePath('/admin/payouts')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** One payment was returned to the client (or undo with null). An unpaid commission on it is cancelled; a paid one is clawed back. */
export async function setPaymentRefund(paymentId: string, date: string | null): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const pid = z.string().cuid().parse(paymentId)
    const d = realDate(date === null ? null : dateInput.parse(date))
    let lid = ''
    await prisma.$transaction(async (tx) => {
      const pay = await tx.leadPayment.findUnique({ where: { id: pid }, select: { leadId: true, receivedAt: true } })
      if (!pay) throw new BookingError('Payment not found.', 'NOT_FOUND')
      lid = pay.leadId
      if (d && d < pay.receivedAt) throw new BookingError('The refund can’t be before the day the client paid.', 'INVALID_STATE')
      const lead = await tx.lead.findUniqueOrThrow({ where: { id: lid }, select: { finalPaidAt: true } })
      if (d && lead.finalPaidAt) throw new BookingError('The bonus was already paid out. Undo that first, then record the refund.', 'INVALID_STATE')
      await tx.leadPayment.update({ where: { id: pid }, data: { refundedAt: d } })
      await syncFullyPaid(tx, lid)
      await logActivity({ entityType: 'LEAD', entityId: lid, action: 'lead.refund_recorded', actorId: admin.id, metadata: { payment: pid, date } }, tx)
    })
    refresh(lid)
    revalidatePath('/admin/payouts')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** The bonus was paid out (or undo with null). It exists only once the whole price has been paid. */
export async function setBonusPaid(id: string, date: string | null): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const lid = leadId.parse(id)
    const d = realDate(date === null ? null : dateInput.parse(date))
    await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({ where: { id: lid }, select: { status: true, finalPaymentReceivedAt: true, refundedAt: true } })
      if (!lead || lead.status !== 'WON') throw new BookingError('Only a won deal has a bonus.', 'INVALID_STATE')
      if (d) {
        if (!lead.finalPaymentReceivedAt) throw new BookingError('The bonus is paid only after the whole price has been paid.', 'INVALID_STATE')
        if (lead.refundedAt) throw new BookingError('The client’s money was returned, so the bonus is cancelled.', 'INVALID_STATE')
        if (d < lead.finalPaymentReceivedAt) throw new BookingError('The payout date can’t be before the day the price was fully paid.', 'INVALID_STATE')
        if (await endedBefore(tx, lid, lead.finalPaymentReceivedAt)) throw new BookingError('The salesperson’s agreement ended before the price was fully paid, so no bonus is owed.', 'INVALID_STATE')
      }
      await tx.lead.update({ where: { id: lid }, data: { finalPaidAt: d } })
      await logActivity({ entityType: 'LEAD', entityId: lid, action: 'lead.bonus_payment', actorId: admin.id, metadata: { date } }, tx)
    })
    refresh(lid)
    revalidatePath('/admin/payouts')
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
    if (await termsLockedBy(user.email)) throw new BookingError(LOCKED_MESSAGE, 'INVALID_STATE')
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


/** Hosting, taxes and out-of-pocket costs taken off the price before commission. Locked once the client's money is recorded, like the price. */
export async function saveExcludedCosts(id: string, amount: number | null): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const lid = leadId.parse(id)
    const value = amount === null || amount === 0 ? null : money.parse(amount)
    const cur = await prisma.lead.findUnique({ where: { id: lid }, select: { status: true, quotedPrice: true, excludedCosts: true, payments: { select: { id: true }, take: 1 } } })
    if (!cur) throw new BookingError('Lead not found.', 'NOT_FOUND')
    if (cur.payments.length) throw new BookingError('A client payment is already recorded, so the commission base can’t change. Remove the payments first.', 'INVALID_STATE')
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

/** The day a salesperson's agreement ended (null = still active). Only deals the client paid for before this day still pay commission. */
export async function setSalespersonTermination(userId: string, date: string | null): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const uid = z.string().cuid().parse(userId)
    const d = realDate(date === null ? null : dateInput.parse(date))
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
