'use server'

import { LeadSourceType, Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { requireUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { type CommissionTerms, dealTerms, parseTerms } from '@/lib/commission'
import { snapshotWonCommission, termsForAssignee } from '@/lib/deals'
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

/** Set or clear the price agreed with the client. On a won deal it refreshes the frozen commission (unless client money is already in). */
export async function saveQuotedPrice(id: string, price: number | null): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const lid = leadId.parse(id)
    const value = price === null ? null : money.parse(price)
    await prisma.$transaction(async (tx) => {
      const before = await tx.lead.findUniqueOrThrow({ where: { id: lid }, select: { quotedPrice: true } })
      if (before.quotedPrice === value) return
      await tx.lead.update({ where: { id: lid }, data: { quotedPrice: value } })
      await logActivity({ entityType: 'LEAD', entityId: lid, action: 'lead.price_changed', actorId: admin.id, metadata: { from: before.quotedPrice, to: value } }, tx)
      await snapshotWonCommission(lid, tx)
    })
    refresh(lid)
    return { ok: true, data: undefined }
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
    const lead = await prisma.lead.findUnique({ where: { id: lid }, select: { status: true, quotedPrice: true } })
    if (!lead || lead.status !== 'WON') throw new BookingError('Only a won deal has a frozen commission.', 'INVALID_STATE')
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
    const lead = await prisma.lead.findUnique({ where: { id: lid }, select: { status: true, commissionTotal: true, finalPaymentReceivedAt: true, finalPaidAt: true } })
    if (!lead || lead.status !== 'WON' || lead.commissionTotal === null) throw new BookingError('Win the deal and enter its price first: that is when the commission is set.', 'INVALID_STATE')
    const date = m.date ? new Date(`${m.date}T12:00:00Z`) : null
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
