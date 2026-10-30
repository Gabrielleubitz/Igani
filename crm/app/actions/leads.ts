'use server'

import { LeadStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { assignLeadManually, assignLeadRoundRobin, changeLeadStatus } from '@/lib/leads'
import { prisma } from '@/lib/prisma'
import { toActionError, type ActionResult } from './result'

async function assertCanTouchLead(leadId: string, user: { id: string; role: string }): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { assignedToId: true } })
  if (!lead) throw new BookingError('Lead not found.', 'NOT_FOUND')
  if (user.role === 'SALES' && lead.assignedToId && lead.assignedToId !== user.id) {
    throw new BookingError('This lead is assigned to another rep.', 'FORBIDDEN')
  }
}

export async function updateLeadStatus(leadId: string, status: LeadStatus): Promise<ActionResult> {
  try {
    const user = await requireUser(['ADMIN', 'SALES'])
    const id = z.string().cuid().parse(leadId)
    await assertCanTouchLead(id, user)
    await changeLeadStatus(id, z.nativeEnum(LeadStatus).parse(status), user.id)
    revalidatePath('/sales')
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
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

export async function autoAssignLead(leadId: string): Promise<ActionResult<{ assignedToId: string | null }>> {
  try {
    await requireUser(['ADMIN'])
    const assignedToId = await assignLeadRoundRobin(z.string().cuid().parse(leadId))
    revalidatePath('/sales')
    return { ok: true, data: { assignedToId } }
  } catch (err) {
    return toActionError(err)
  }
}
