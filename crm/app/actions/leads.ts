'use server'

import { LeadStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { logActivity } from '@/lib/audit'
import { assignLeadManually, assignLeadRoundRobin, bulkUpdateLeadsTx, changeLeadStatus } from '@/lib/leads'
import { buildLeadWhere, parseLeadFilters, toCsv } from '@/lib/lead-query'
import { assertCanMoveLead, assertCanSeeLead, assertCanSeeLeads, leadScope } from '@/lib/lead-access'
import { prisma } from '@/lib/prisma'
import { toActionError, type ActionResult } from './result'

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  extras: { lostReason?: string; dealValue?: number } = {},
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const id = z.string().cuid().parse(leadId)
    await assertCanMoveLead(id, user)
    const parsed = z.nativeEnum(LeadStatus).parse(status)
    const ex = z.object({ lostReason: z.string().trim().max(500).optional(), dealValue: z.number().int().min(0).max(1_000_000_000).optional() }).parse(extras)
    if (parsed === 'LOST' && !ex.lostReason) throw new z.ZodError([{ code: 'custom', path: ['lostReason'], message: 'A reason is required when marking a lead as lost' }])
    await changeLeadStatus(id, parsed, user.id, ex)
    revalidatePath('/sales', 'layout')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** ADMIN: assign to a specific rep (or null to unassign). SALES: may only claim unassigned leads for themselves. */
export async function assignLead(leadId: string, assigneeId: string | null): Promise<ActionResult> {
  try {
    const user = await requireUser(['ADMIN', 'SALES'])
    const id = z.string().cuid().parse(leadId)
    const to = assigneeId ? z.string().cuid().parse(assigneeId) : null
    if (user.role === 'SALES') {
      const lead = await prisma.lead.findUnique({ where: { id }, select: { assignedToId: true } })
      if (!lead) throw new BookingError('Lead not found.', 'NOT_FOUND')
      if (to !== user.id || lead.assignedToId) throw new BookingError('Reps can only claim unassigned leads.', 'FORBIDDEN')
    }
    await assignLeadManually(id, to, user.id)
    revalidatePath('/sales', 'layout')
    return { ok: true, data: undefined }
  } catch (err) {
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
  dealValue: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
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
      // Only record fields that really changed, so the timeline stays readable.
      const changed = (Object.keys(data) as (keyof typeof data)[]).filter((k) => data[k] !== undefined && JSON.stringify(data[k]) !== JSON.stringify(before[k]))
      if (changed.length === 0) return
      if (data.email && data.email !== before.email && (await tx.lead.findUnique({ where: { email: data.email }, select: { id: true } }))) {
        throw new BookingError('Another contact already uses this email address.', 'INVALID_STATE')
      }
      if (data.email === null && !(data.phone ?? before.phone)) throw new BookingError('Keep at least an email or a phone number.', 'INVALID_STATE')
      await tx.lead.update({ where: { id }, data })
      await logActivity({ entityType: 'LEAD', entityId: id, action: 'lead.edited', actorId: admin.id, metadata: { fields: changed } }, tx)
    })
    revalidatePath('/sales', 'layout')
    return { ok: true, data: undefined }
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
      if (exists) throw new BookingError('A contact with this email already exists.', 'INVALID_STATE')
    }
    const lead = await prisma.$transaction(async (tx) => {
      // Reps own what they add; admins/marketing leave it unassigned for round-robin or manual assignment.
      const l = await tx.lead.create({ data: { ...data, email: data.email ?? null, source: data.source || 'Other', assignedToId: admin.role === 'SALES' ? admin.id : null } })
      await logActivity({ entityType: 'LEAD', entityId: l.id, action: 'lead.created', actorId: admin.id, metadata: { source: l.source, sourceDetail: l.sourceDetail } }, tx)
      return l
    })
    revalidatePath('/sales', 'layout')
    return { ok: true, data: { id: lead.id } }
  } catch (err) {
    return toActionError(err)
  }
}

/** Archive (soft-delete) or restore leads: admins any, reps only their own. */
export async function archiveLeads(leadIds: string[], archived: boolean): Promise<ActionResult<{ count: number }>> {
  try {
    const admin = await requireUser()
    const ids = z.array(z.string().cuid()).min(1).max(500).parse(leadIds)
    if (admin.role === 'MARKETING') throw new BookingError('Only sales and admins can archive contacts.', 'FORBIDDEN')
    await assertCanSeeLeads(ids, admin, true)
    const res = await prisma.$transaction(async (tx) => {
      const r = await tx.lead.updateMany({ where: { id: { in: ids } }, data: { archived } })
      await tx.activityLog.createMany({ data: ids.map((id) => ({ entityType: 'LEAD' as const, entityId: id, action: archived ? 'lead.archived' : 'lead.restored', actorId: admin.id })) })
      return r
    })
    revalidatePath('/sales', 'layout')
    return { ok: true, data: { count: res.count } }
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
export async function bulkUpdateLeads(leadIds: string[], change: { assigneeId?: string | null; status?: LeadStatus }): Promise<ActionResult<{ count: number }>> {
  try {
    const admin = await requireUser()
    const ids = z.array(z.string().cuid()).min(1).max(500).parse(leadIds)
    const ch = z.object({ assigneeId: z.string().cuid().nullable().optional(), status: z.nativeEnum(LeadStatus).optional() }).parse(change)
    if (ch.assigneeId !== undefined && admin.role !== 'ADMIN') throw new BookingError('Only admins can reassign contacts in bulk.', 'FORBIDDEN')
    if (ch.status) await assertCanSeeLeads(ids, admin, true)
    if (ch.status === 'LOST') throw new BookingError('Mark leads as lost one by one so a reason is recorded.', 'INVALID_STATE')
    await bulkUpdateLeadsTx(ids, ch, admin.id)
    revalidatePath('/sales', 'layout')
    return { ok: true, data: { count: ids.length } }
  } catch (err) {
    return toActionError(err)
  }
}

/** CSV export of the contacts the user can see, matching the (URL-style) filters. */
export async function exportLeadsCsv(params: Record<string, string | undefined> = {}): Promise<ActionResult<{ csv: string }>> {
  try {
    const user = await requireUser()
    const leads = await prisma.lead.findMany({
      where: { AND: [buildLeadWhere(parseLeadFilters(params)), leadScope(user)] },
      orderBy: { createdAt: 'desc' },
      take: 10000,
      include: { assignedTo: { select: { email: true } } },
    })
    const csv = toCsv(
      ['email', 'firstName', 'lastName', 'phone', 'company', 'website', 'status', 'owner', 'source', 'sourceDetail', 'utmSource', 'utmMedium', 'utmCampaign', 'budget', 'dealValue', 'tags', 'lostReason', 'createdAt'],
      leads.map((l) => [l.email, l.firstName, l.lastName, l.phone, l.company, l.website, l.status, l.assignedTo?.email, l.source, l.sourceDetail, l.utmSource, l.utmMedium, l.utmCampaign, l.budget, l.dealValue, l.tags.join(';'), l.lostReason, l.createdAt]),
    )
    return { ok: true, data: { csv } }
  } catch (err) {
    return toActionError(err)
  }
}
