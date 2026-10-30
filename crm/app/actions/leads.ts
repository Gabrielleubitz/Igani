'use server'

import { LeadStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { logActivity } from '@/lib/audit'
import { assignLeadManually, assignLeadRoundRobin, changeLeadStatus } from '@/lib/leads'
import { buildLeadWhere, parseLeadFilters, toCsv } from '@/lib/lead-query'
import { prisma } from '@/lib/prisma'
import { toActionError, type ActionResult } from './result'

async function assertCanTouchLead(leadId: string, user: { id: string; role: string }): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { assignedToId: true } })
  if (!lead) throw new BookingError('Lead not found.', 'NOT_FOUND')
  // Reps must own a lead (claim it first) before changing it.
  if (user.role === 'SALES' && lead.assignedToId !== user.id) {
    throw new BookingError(lead.assignedToId ? 'This lead is assigned to another rep.' : 'Claim this lead before changing it.', 'FORBIDDEN')
  }
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  extras: { lostReason?: string; dealValue?: number } = {},
): Promise<ActionResult> {
  try {
    const user = await requireUser(['ADMIN', 'SALES'])
    const id = z.string().cuid().parse(leadId)
    await assertCanTouchLead(id, user)
    const parsed = z.nativeEnum(LeadStatus).parse(status)
    const ex = z.object({ lostReason: z.string().trim().max(500).optional(), dealValue: z.number().int().min(0).max(1_000_000_000).optional() }).parse(extras)
    if (parsed === 'LOST' && !ex.lostReason) throw new z.ZodError([{ code: 'custom', path: ['lostReason'], message: 'A reason is required when marking a lead as lost' }])
    await changeLeadStatus(id, parsed, user.id, ex)
    revalidatePath('/sales')
    revalidatePath('/admin/leads')
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
    revalidatePath('/sales')
    revalidatePath('/admin/leads')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

export async function autoAssignLead(leadId: string): Promise<ActionResult<{ assignedToId: string | null }>> {
  try {
    await requireUser(['ADMIN'])
    const assignedToId = await assignLeadRoundRobin(z.string().cuid().parse(leadId), { force: true })
    revalidatePath('/sales')
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
    .transform((v) => v || null)

const leadEditSchema = z.object({
  firstName: optText(100),
  lastName: optText(100),
  phone: optText(40),
  company: optText(200),
  website: optText(500),
  budget: optText(100),
  message: optText(20000),
  dealValue: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
})

/** ADMIN: edit contact fields of a lead (email is the dedupe key and stays fixed). */
export async function updateLead(leadId: string, input: z.input<typeof leadEditSchema>): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const id = z.string().cuid().parse(leadId)
    const data = leadEditSchema.parse(input)
    await prisma.$transaction(async (tx) => {
      await tx.lead.update({ where: { id }, data })
      await logActivity({ entityType: 'LEAD', entityId: id, action: 'lead.edited', actorId: admin.id, metadata: { fields: Object.keys(data) } }, tx)
    })
    revalidatePath('/admin/leads')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** ADMIN: manually create a lead (dedupes by email). */
export async function createLead(input: { email: string; firstName?: string; lastName?: string; phone?: string; company?: string; source?: string }): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireUser(['ADMIN'])
    const data = z
      .object({ email: z.string().trim().toLowerCase().email().max(254), firstName: optText(100), lastName: optText(100), phone: optText(40), company: optText(200), source: optText(100) })
      .parse(input)
    const exists = await prisma.lead.findUnique({ where: { email: data.email }, select: { id: true } })
    if (exists) throw new BookingError('A lead with this email already exists.', 'INVALID_STATE')
    const lead = await prisma.$transaction(async (tx) => {
      const l = await tx.lead.create({ data: { ...data, source: data.source ?? 'manual' } })
      await logActivity({ entityType: 'LEAD', entityId: l.id, action: 'lead.created', actorId: admin.id, metadata: { source: l.source } }, tx)
      return l
    })
    revalidatePath('/admin/leads')
    return { ok: true, data: { id: lead.id } }
  } catch (err) {
    return toActionError(err)
  }
}

/** ADMIN: archive (soft-delete) or restore leads. */
export async function archiveLeads(leadIds: string[], archived: boolean): Promise<ActionResult<{ count: number }>> {
  try {
    const admin = await requireUser(['ADMIN'])
    const ids = z.array(z.string().cuid()).min(1).max(500).parse(leadIds)
    const res = await prisma.$transaction(async (tx) => {
      const r = await tx.lead.updateMany({ where: { id: { in: ids } }, data: { archived } })
      await tx.activityLog.createMany({ data: ids.map((id) => ({ entityType: 'LEAD' as const, entityId: id, action: archived ? 'lead.archived' : 'lead.restored', actorId: admin.id })) })
      return r
    })
    revalidatePath('/admin/leads')
    revalidatePath('/sales')
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
    revalidatePath('/admin/leads')
    return { ok: true, data: { count: res.count } }
  } catch (err) {
    return toActionError(err)
  }
}

/** ADMIN: bulk assign (null = unassign) and/or bulk status change. */
export async function bulkUpdateLeads(leadIds: string[], change: { assigneeId?: string | null; status?: LeadStatus }): Promise<ActionResult<{ count: number }>> {
  try {
    const admin = await requireUser(['ADMIN'])
    const ids = z.array(z.string().cuid()).min(1).max(500).parse(leadIds)
    const ch = z.object({ assigneeId: z.string().cuid().nullable().optional(), status: z.nativeEnum(LeadStatus).optional() }).parse(change)
    if (ch.status === 'LOST') throw new BookingError('Mark leads as lost one by one so a reason is recorded.', 'INVALID_STATE')
    for (const id of ids) {
      if (ch.assigneeId !== undefined) await assignLeadManually(id, ch.assigneeId, admin.id)
      if (ch.status) await changeLeadStatus(id, ch.status, admin.id)
    }
    revalidatePath('/admin/leads')
    revalidatePath('/sales')
    return { ok: true, data: { count: ids.length } }
  } catch (err) {
    return toActionError(err)
  }
}

export async function addLeadNote(leadId: string, body: string): Promise<ActionResult> {
  try {
    const user = await requireUser(['ADMIN', 'SALES'])
    const id = z.string().cuid().parse(leadId)
    const text = z.string().trim().min(1).max(5000).parse(body)
    await assertCanTouchLead(id, user)
    await prisma.$transaction(async (tx) => {
      await tx.leadNote.create({ data: { leadId: id, authorId: user.id, body: text } })
      await logActivity({ entityType: 'LEAD', entityId: id, action: 'lead.note_added', actorId: user.id }, tx)
    })
    revalidatePath('/admin/leads')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** ADMIN: CSV export of leads matching the (URL-style) filters. */
export async function exportLeadsCsv(params: Record<string, string | undefined> = {}): Promise<ActionResult<{ csv: string }>> {
  try {
    await requireUser(['ADMIN'])
    const leads = await prisma.lead.findMany({
      where: buildLeadWhere(parseLeadFilters(params)),
      orderBy: { createdAt: 'desc' },
      take: 10000,
      include: { assignedTo: { select: { email: true } } },
    })
    const csv = toCsv(
      ['email', 'firstName', 'lastName', 'phone', 'company', 'website', 'status', 'owner', 'source', 'utmSource', 'utmMedium', 'utmCampaign', 'budget', 'dealValue', 'lostReason', 'createdAt'],
      leads.map((l) => [l.email, l.firstName, l.lastName, l.phone, l.company, l.website, l.status, l.assignedTo?.email, l.source, l.utmSource, l.utmMedium, l.utmCampaign, l.budget, l.dealValue, l.lostReason, l.createdAt]),
    )
    return { ok: true, data: { csv } }
  } catch (err) {
    return toActionError(err)
  }
}
