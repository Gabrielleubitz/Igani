'use server'

import { identifyNumber, type CallerId } from '@/lib/caller-id'
import { LeadStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { logActivity } from '@/lib/audit'
import { assignLeadManually, assignLeadRoundRobin, bulkUpdateLeadsTx, changeLeadStatus, findExistingLead, notifyTeamOfNewLead, phoneKey } from '@/lib/leads'
import { buildLeadWhere, parseLeadFilters, toCsv } from '@/lib/lead-query'
import { assertCanMoveLead, assertCanSeeLead, assertCanSeeLeads, leadScope } from '@/lib/lead-access'
import { applyCommissionChoice } from '@/lib/deals'
import { prisma } from '@/lib/prisma'
import { stageChangeProblem } from '@/lib/stage-rules'
import { toActionError, type ActionResult } from './result'

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  extras: { lostReason?: string; quotedPrice?: number } = {},
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const id = z.string().cuid().parse(leadId)
    await assertCanMoveLead(id, user)
    const parsed = z.nativeEnum(LeadStatus).parse(status)
    const current = await prisma.lead.findUniqueOrThrow({ where: { id }, select: { status: true, finalPaymentReceivedAt: true, finalPaidAt: true, payments: { select: { id: true }, take: 1 } } })
    const problem = stageChangeProblem(user.role, current.status, parsed)
    if (problem) throw new BookingError(problem, 'FORBIDDEN')
    if (current.status === 'WON' && parsed !== 'WON' && (current.finalPaymentReceivedAt || current.finalPaidAt || current.payments.length)) {
      throw new BookingError('This deal can’t leave Won: a client payment or a commission payout is already recorded. Remove those on the lead first.', 'INVALID_STATE')
    }
    const ex = z.object({ lostReason: z.string().trim().max(500).optional(), quotedPrice: z.number().int().min(0).max(1_000_000_000).optional() }).parse(extras)
    // Prices are an admin matter: a salesperson can never enter or change one.
    if (ex.quotedPrice !== undefined && user.role !== 'ADMIN') throw new BookingError('Only an admin can enter a price.', 'FORBIDDEN')
    if (parsed === 'LOST' && !ex.lostReason) throw new z.ZodError([{ code: 'custom', path: ['lostReason'], message: 'A reason is required when marking a lead as lost' }])
    await changeLeadStatus(id, parsed, user.id, ex)
    revalidatePath('/sales', 'layout')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/**
 * ADMIN only: assign to a specific rep (or null to unassign).
 * A won deal with a commission carries that commission with it, so moving it to someone else needs a decision:
 * keep the amount as it is, recalculate it with the new rep's terms, or set a custom amount. A commission that was
 * already paid out can't move (undo the payout first).
 */
export async function assignLead(leadId: string, assigneeId: string | null, commission?: { mode: 'keep' | 'recalculate' | 'custom'; amount?: number }): Promise<ActionResult> {
  try {
    // Only admins assign leads; salespeople see just the leads they were given.
    const user = await requireUser(['ADMIN'])
    const id = z.string().cuid().parse(leadId)
    const to = assigneeId ? z.string().cuid().parse(assigneeId) : null
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id }, select: { status: true, assignedToId: true, commissionTotal: true, finalPaidAt: true } })
    const carriesCommission = lead.status === 'WON' && lead.commissionTotal !== null && lead.assignedToId !== to
    if (carriesCommission) {
      if (lead.finalPaidAt) throw new BookingError('This deal’s commission was already paid out to the current rep. Undo the payout on the lead before reassigning it.', 'INVALID_STATE')
      if (!commission) throw new BookingError('This is a won deal with a commission. Open the lead and reassign it from there, where you can choose what happens to the commission.', 'INVALID_STATE')
    }
    const choice = carriesCommission ? z.object({ mode: z.enum(['keep', 'recalculate', 'custom']), amount: z.number().int().min(0).max(1_000_000_000).optional() }).parse(commission) : null
    if (choice?.mode === 'custom' && choice.amount === undefined) throw new BookingError('Enter the commission amount.', 'INVALID_STATE')
    await assignLeadManually(id, to, user.id)
    if (choice && choice.mode !== 'keep') await applyCommissionChoice(id, choice.mode, choice.amount, user.id)
    else if (choice) await logActivity({ entityType: 'LEAD', entityId: id, actorId: user.id, action: 'lead.commission_kept_on_reassign', metadata: { total: lead.commissionTotal } })
    revalidatePath('/sales', 'layout')
    return { ok: true, data: undefined }
  } catch (err) {
    if (err instanceof Error && err.message === 'ALREADY_CLAIMED') return { ok: false, error: 'A teammate just claimed this contact.' }
    return toActionError(err)
  }
}

export async function autoAssignLead(leadId: string): Promise<ActionResult<{ assignedToId: string | null }>> {
  try {
    await requireUser(['ADMIN'])
    const assignedToId = await assignLeadRoundRobin(z.string().cuid().parse(leadId), { force: true })
    if (!assignedToId) throw new BookingError('No active sales reps to assign to. Add one under Team, or pick an owner manually.', 'INVALID_STATE')
    revalidatePath('/sales', 'layout')
    return { ok: true, data: { assignedToId } }
  } catch (err) {
    return toActionError(err)
  }
}

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    // undefined = field not supplied (leave untouched); '' = clear it
    .transform((v) => (v === undefined ? undefined : v || null))

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .optional()
  .transform((v) => (v === undefined ? undefined : v || null))
  .pipe(z.string().email('Enter a valid email address').nullable().optional())

const leadEditSchema = z.object({
  email: emailField,
  source: z.string().trim().min(1, 'Pick where the contact came from').max(100).optional(),
  sourceDetail: optText(300),
  firstName: optText(100),
  lastName: optText(100),
  phone: optText(40),
  company: optText(200),
  website: optText(500),
  budget: optText(100),
  message: optText(20000),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(20).transform((t) => [...new Set(t)]).optional(),
})

/** Edit contact fields (including email, where they came from and source detail) of a lead the user can see. */
export async function updateLead(leadId: string, input: z.input<typeof leadEditSchema>): Promise<ActionResult> {
  try {
    const admin = await requireUser()
    const id = z.string().cuid().parse(leadId)
    const data = leadEditSchema.parse(input)
    await assertCanSeeLead(id, admin)
    await prisma.$transaction(async (tx) => {
      const before = await tx.lead.findUniqueOrThrow({ where: { id } })
      // The email decides whose mail is filed under this lead, so only admins may change it.
      if (admin.role !== 'ADMIN' && data.email !== undefined && data.email !== before.email) {
        throw new BookingError('Only an admin can change a lead’s email address.', 'FORBIDDEN')
      }
      // Only record fields that really changed, so the timeline stays readable.
      const changed = (Object.keys(data) as (keyof typeof data)[]).filter((k) => data[k] !== undefined && JSON.stringify(data[k]) !== JSON.stringify(before[k]))
      if (changed.length === 0) return
      if (data.email && data.email !== before.email && (await tx.lead.findUnique({ where: { email: data.email }, select: { id: true } }))) {
        throw new BookingError('Another contact already uses this email address.', 'INVALID_STATE')
      }
      // Check the values the contact will END UP with (a blank field arrives as null = cleared).
      const nextEmail = data.email !== undefined ? data.email : before.email
      const nextPhone = data.phone !== undefined ? data.phone : before.phone
      if (!nextEmail && !phoneKey(nextPhone)) throw new BookingError('Keep at least an email or a phone number.', 'INVALID_STATE')
      await tx.lead.update({ where: { id }, data })
      await logActivity({ entityType: 'LEAD', entityId: id, action: 'lead.edited', actorId: admin.id, metadata: { fields: changed } }, tx)
    })
    revalidatePath('/sales', 'layout')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/**
 * Is this number already in the CRM? For the new-contact form: the lead it belongs to (a link only when you may open
 * it), a call-list business, or the business Google lists at that number.
 */
export async function checkContactPhone(phone: string): Promise<ActionResult<CallerId | null>> {
  try {
    const user = await requireUser()
    const p = z.string().trim().min(3).max(40).parse(phone)
    return { ok: true, data: await identifyNumber(p, user, { lookup: true }) }
  } catch (err) {
    return toActionError(err)
  }
}

/** Any role: manually create a contact. Needs an email or a phone; dedupes by email. */
export async function createLead(input: { email?: string; firstName?: string; lastName?: string; phone?: string; company?: string; source?: string; sourceDetail?: string; tags?: string[] }): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireUser()
    const data = z
      .object({
        email: emailField,
        firstName: optText(100),
        lastName: optText(100),
        phone: optText(40),
        company: optText(200),
        source: z.string().trim().max(100).optional(),
        sourceDetail: optText(300),
        tags: leadEditSchema.shape.tags,
      })
      .refine((d) => Boolean(d.email || d.phone), { message: 'Add an email or a phone number', path: ['email'] })
      .parse(input)
    if (data.email) {
      const exists = await prisma.lead.findUnique({ where: { email: data.email }, select: { id: true } })
      if (exists) throw new BookingError('A lead with this email already exists.', 'INVALID_STATE')
    } else if (data.phone) {
      // Phone-only: same matching rule as the website forms and the dialer, so hand-added contacts don't duplicate.
      if (await findExistingLead(prisma, undefined, data.phone)) throw new BookingError('A lead with this phone number already exists. Search for it in Leads.', 'INVALID_STATE')
    }
    const lead = await prisma.$transaction(async (tx) => {
      // Reps own what they add; admins/marketing leave it unassigned for round-robin or manual assignment.
      const l = await tx.lead.create({ data: { ...data, email: data.email ?? null, source: data.source || 'Other', assignedToId: admin.role === 'SALES' ? admin.id : null } })
      await logActivity({ entityType: 'LEAD', entityId: l.id, action: 'lead.created', actorId: admin.id, metadata: { source: l.source, sourceDetail: l.sourceDetail } }, tx)
      return l
    })
    revalidatePath('/sales', 'layout')
    // Alert the admins now. Awaited (it never throws and gives up after a few seconds) so the send isn't cut off when this request ends.
    await notifyTeamOfNewLead(lead.id, { addedBy: { id: admin.id, name: admin.name ?? admin.email, email: admin.email } })
    return { ok: true, data: { id: lead.id } }
  } catch (err) {
    return toActionError(err)
  }
}

/**
 * Archive or restore leads FOR THE PERSON DOING IT: the lead leaves their lists, and nobody else's. Statistics never change.
 * Admins may archive any lead for themselves; reps only their own.
 */
export async function archiveLeads(leadIds: string[], archived: boolean): Promise<ActionResult<{ count: number }>> {
  try {
    const user = await requireUser()
    const ids = z.array(z.string().cuid()).min(1).max(500).parse(leadIds)
    if (user.role === 'MARKETING') throw new BookingError('Only sales and admins can archive contacts.', 'FORBIDDEN')
    await assertCanSeeLeads(ids, user, true)
    await prisma.$transaction(async (tx) => {
      if (archived) await tx.leadArchive.createMany({ data: ids.map((leadId) => ({ leadId, userId: user.id })), skipDuplicates: true })
      else await tx.leadArchive.deleteMany({ where: { leadId: { in: ids }, userId: user.id } })
      await tx.activityLog.createMany({ data: ids.map((id) => ({ entityType: 'LEAD' as const, entityId: id, action: archived ? 'lead.archived' : 'lead.restored', actorId: user.id })) })
    })
    revalidatePath('/sales', 'layout')
    return { ok: true, data: { count: ids.length } }
  } catch (err) {
    return toActionError(err)
  }
}

/** ADMIN: permanently delete leads (bookings keep their guest data; the link is cleared). */
export async function deleteLeads(leadIds: string[]): Promise<ActionResult<{ count: number }>> {
  try {
    const admin = await requireUser(['ADMIN'])
    const ids = z.array(z.string().cuid()).min(1).max(500).parse(leadIds)
    const res = await prisma.$transaction(async (tx) => {
      const leads = await tx.lead.findMany({ where: { id: { in: ids } }, select: { id: true, email: true } })
      const r = await tx.lead.deleteMany({ where: { id: { in: ids } } })
      await tx.activityLog.createMany({ data: leads.map((l) => ({ entityType: 'LEAD' as const, entityId: l.id, action: 'lead.deleted', actorId: admin.id, metadata: { email: l.email } })) })
      return r
    })
    revalidatePath('/sales', 'layout')
    return { ok: true, data: { count: res.count } }
  } catch (err) {
    return toActionError(err)
  }
}

/** Bulk assign (ADMIN only; null = unassign) and/or bulk stage change (reps: own contacts only). */
export async function bulkUpdateLeads(leadIds: string[], change: { assigneeId?: string | null; status?: LeadStatus }): Promise<ActionResult<{ count: number; skippedNoPrice: number }>> {
  try {
    const admin = await requireUser()
    const ids = z.array(z.string().cuid()).min(1).max(500).parse(leadIds)
    const ch = z.object({ assigneeId: z.string().cuid().nullable().optional(), status: z.nativeEnum(LeadStatus).optional() }).parse(change)
    if (ch.assigneeId !== undefined && admin.role !== 'ADMIN') throw new BookingError('Only admins can reassign contacts in bulk.', 'FORBIDDEN')
    if (ch.status) await assertCanSeeLeads(ids, admin, true)
    const rows = await prisma.lead.findMany({ where: { id: { in: ids } }, select: { status: true, assignedToId: true, commissionTotal: true, finalPaymentReceivedAt: true, finalPaidAt: true, payments: { select: { id: true }, take: 1 } } })
    if (ch.assigneeId !== undefined && rows.some((r) => r.status === 'WON' && r.commissionTotal !== null && r.assignedToId !== ch.assigneeId)) {
      throw new BookingError('Some of these are won deals with a commission. Reassign those one at a time, from the lead, so you can decide what happens to the commission.', 'INVALID_STATE')
    }
    if (ch.status && admin.role !== 'ADMIN') {
      const problem = rows.map((r) => stageChangeProblem(admin.role, r.status, ch.status!)).find(Boolean)
      if (problem) throw new BookingError(problem, 'FORBIDDEN')
    }
    if (ch.status && ch.status !== 'WON' && rows.some((r) => r.status === 'WON' && (r.finalPaymentReceivedAt || r.finalPaidAt || r.payments.length))) {
      throw new BookingError('Some of these deals can’t leave Won: the client’s payment or the commission payout is already recorded.', 'INVALID_STATE')
    }
    if (ch.status === 'LOST') throw new BookingError('Mark leads as lost one by one so a reason is recorded.', 'INVALID_STATE')
    const { skippedNoPrice } = await bulkUpdateLeadsTx(ids, ch, admin.id)
    revalidatePath('/sales', 'layout')
    return { ok: true, data: { count: ids.length - skippedNoPrice.length, skippedNoPrice: skippedNoPrice.length } }
  } catch (err) {
    return toActionError(err)
  }
}

/** CSV export of the contacts the user can see, matching the (URL-style) filters. */
export async function exportLeadsCsv(params: Record<string, string | undefined> = {}): Promise<ActionResult<{ csv: string }>> {
  try {
    const user = await requireUser()
    const leads = await prisma.lead.findMany({
      where: { AND: [buildLeadWhere(parseLeadFilters(params), user.id), leadScope(user)] },
      orderBy: { createdAt: 'desc' },
      take: 50_000,
      include: { assignedTo: { select: { email: true } } },
    })
    const csv = toCsv(
      ['email', 'firstName', 'lastName', 'phone', 'company', 'website', 'status', 'owner', 'source', 'sourceDetail', 'utmSource', 'utmMedium', 'utmCampaign', 'budget', ...(user.role === 'ADMIN' ? ['quotedPrice'] : []), 'tags', 'lostReason', 'createdAt'],
      leads.map((l) => [l.email, l.firstName, l.lastName, l.phone, l.company, l.website, l.status, l.assignedTo?.email, l.source, l.sourceDetail, l.utmSource, l.utmMedium, l.utmCampaign, l.budget, ...(user.role === 'ADMIN' ? [l.quotedPrice] : []), l.tags.join(';'), l.lostReason, l.createdAt]),
    )
    return { ok: true, data: { csv } }
  } catch (err) {
    return toActionError(err)
  }
}
