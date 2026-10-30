'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { toActionError, type ActionResult } from '@/app/actions/result'
import { TASK_PRIORITIES, type TaskPriority } from '@/components/crm/crm-utils'
import { logActivity } from '@/lib/audit'
import { requireUser, type SessionUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { prisma } from '@/lib/prisma'

async function assertOwnsLead(leadId: string, user: SessionUser): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } })
  if (!lead) throw new BookingError('Lead not found.', 'NOT_FOUND')
}

export async function addNote(leadId: string, body: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const id = z.string().cuid().parse(leadId)
    const text = z.string().trim().min(1).max(5000).parse(body)
    await assertOwnsLead(id, user)
    await logActivity({ entityType: 'LEAD', entityId: id, actorId: user.id, action: 'note.added', metadata: { body: text } })
    revalidatePath(`/sales/leads/${id}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

export async function createTask(leadId: string, title: string, dueAt: string | null, priority: TaskPriority = 'MEDIUM'): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const id = z.string().cuid().parse(leadId)
    const t = z.string().trim().min(1).max(200).parse(title)
    const prio = z.enum(TASK_PRIORITIES).parse(priority)
    const due = dueAt ? z.coerce.date().parse(dueAt).toISOString() : null
    await assertOwnsLead(id, user)
    await logActivity({
      entityType: 'LEAD',
      entityId: id,
      actorId: user.id,
      action: 'task.created',
      metadata: { taskId: randomUUID(), title: t, dueAt: due, assigneeId: user.id, priority: prio },
    })
    revalidatePath(`/sales/leads/${id}`)
    revalidatePath('/sales/tasks')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

export async function completeTask(leadId: string, taskId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const id = z.string().cuid().parse(leadId)
    const tid = z.string().uuid().parse(taskId)
    await assertOwnsLead(id, user)
    await logActivity({ entityType: 'LEAD', entityId: id, actorId: user.id, action: 'task.completed', metadata: { taskId: tid } })
    revalidatePath(`/sales/leads/${id}`)
    revalidatePath('/sales/tasks')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}
