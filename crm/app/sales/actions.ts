'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { toActionError, type ActionResult } from '@/app/actions/result'
import { TASK_PRIORITIES, type TaskPriority } from '@/components/crm/crm-utils'
import { logActivity } from '@/lib/audit'
import { requireUser, type SessionUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { sendContactEmail } from '@/lib/email'
import { assertCanSeeLead } from '@/lib/lead-access'
import { prisma } from '@/lib/prisma'
import { loadTasks } from '@/lib/tasks'

const refresh = (leadId?: string): void => {
  if (leadId) revalidatePath(`/sales/leads/${leadId}`)
  revalidatePath('/sales', 'layout')
}

export async function addNote(leadId: string, body: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const id = z.string().cuid().parse(leadId)
    const text = z.string().trim().min(1, 'Write something first').max(5000).parse(body)
    await assertCanSeeLead(id, user)
    await logActivity({ entityType: 'LEAD', entityId: id, actorId: user.id, action: 'note.added', metadata: { body: text } })
    refresh(id)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

const TOUCH_KINDS = ['call', 'email', 'meeting', 'whatsapp'] as const

/** Log an outbound touch (call/email/…) on a lead; resets the stale-lead clock. */
export async function logTouch(leadId: string, kind: (typeof TOUCH_KINDS)[number], summary: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const id = z.string().cuid().parse(leadId)
    const k = z.enum(TOUCH_KINDS).parse(kind)
    const text = z.string().trim().max(2000).parse(summary)
    await assertCanSeeLead(id, user)
    await logActivity({ entityType: 'LEAD', entityId: id, actorId: user.id, action: 'touch.logged', metadata: { kind: k, summary: text } })
    refresh(id)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

async function assertAssignable(assigneeId: string | null): Promise<void> {
  if (!assigneeId) return
  const u = await prisma.user.findUnique({ where: { id: assigneeId }, select: { role: true } })
  if (!u?.role) throw new BookingError('That teammate no longer has access.', 'INVALID_STATE')
}

export async function createTask(
  leadId: string,
  title: string,
  dueAt: string | null,
  priority: TaskPriority = 'MEDIUM',
  assigneeId?: string | null,
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const id = z.string().cuid().parse(leadId)
    const t = z.string().trim().min(1, 'Give the task a title').max(200).parse(title)
    const prio = z.enum(TASK_PRIORITIES).parse(priority)
    const due = dueAt ? z.coerce.date().parse(dueAt).toISOString() : null
    const assignee = assigneeId === undefined ? user.id : assigneeId === null ? null : z.string().cuid().parse(assigneeId)
    await assertCanSeeLead(id, user)
    await assertAssignable(assignee)
    await logActivity({
      entityType: 'LEAD',
      entityId: id,
      actorId: user.id,
      action: 'task.created',
      metadata: { taskId: randomUUID(), title: t, dueAt: due, assigneeId: assignee, priority: prio },
    })
    refresh(id)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Loads the task (and checks the user may see its contact) before any change. */
async function taskFor(leadId: string, taskId: string, user: SessionUser): Promise<{ id: string; tid: string }> {
  const id = z.string().cuid().parse(leadId)
  const tid = z.string().uuid().parse(taskId)
  await assertCanSeeLead(id, user)
  const task = (await loadTasks([id])).find((t) => t.id === tid)
  if (!task) throw new BookingError('Task not found (it may have been deleted).', 'NOT_FOUND')
  return { id, tid }
}

export async function completeTask(leadId: string, taskId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const { id, tid } = await taskFor(leadId, taskId, user)
    await logActivity({ entityType: 'LEAD', entityId: id, actorId: user.id, action: 'task.completed', metadata: { taskId: tid } })
    refresh(id)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

export async function reopenTask(leadId: string, taskId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const { id, tid } = await taskFor(leadId, taskId, user)
    await logActivity({ entityType: 'LEAD', entityId: id, actorId: user.id, action: 'task.reopened', metadata: { taskId: tid } })
    refresh(id)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

export async function deleteTask(leadId: string, taskId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const { id, tid } = await taskFor(leadId, taskId, user)
    await logActivity({ entityType: 'LEAD', entityId: id, actorId: user.id, action: 'task.deleted', metadata: { taskId: tid } })
    refresh(id)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

const taskEditSchema = z.object({
  title: z.string().trim().min(1, 'Give the task a title').max(200).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: z.string().cuid().nullable().optional(),
})

export async function updateTask(leadId: string, taskId: string, input: z.input<typeof taskEditSchema>): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const { id, tid } = await taskFor(leadId, taskId, user)
    const ch = taskEditSchema.parse(input)
    if (ch.assigneeId !== undefined) await assertAssignable(ch.assigneeId)
    await logActivity({ entityType: 'LEAD', entityId: id, actorId: user.id, action: 'task.updated', metadata: { taskId: tid, ...ch } })
    refresh(id)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

const emailSchema = z.object({
  subject: z.string().trim().min(1, 'Add a subject').max(200),
  body: z.string().trim().min(1, 'Write a message').max(10000),
  cta: z
    .object({ label: z.string().trim().min(1).max(60), href: z.string().trim().url().max(1000) })
    .optional(),
})

/** Send a branded Igani email to the contact from inside the CRM. Replies go to the sender; it is logged on the timeline. */
export async function emailContact(leadId: string, input: z.input<typeof emailSchema>): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const id = z.string().cuid().parse(leadId)
    const data = emailSchema.parse(input)
    await assertCanSeeLead(id, user)
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id }, select: { email: true, firstName: true } })
    if (!lead.email) throw new BookingError('This contact has no email address yet. Add one under Edit details first.', 'INVALID_STATE')
    const emailId = await sendContactEmail({
      to: lead.email,
      subject: data.subject,
      body: data.body,
      firstName: lead.firstName,
      senderName: user.name ?? user.email,
      senderEmail: user.email,
      cta: data.cta,
    })
    await logActivity({
      entityType: 'LEAD',
      entityId: id,
      actorId: user.id,
      action: 'email.sent',
      metadata: { subject: data.subject, body: data.body.slice(0, 2000), emailId },
    })
    refresh(id)
    return { ok: true, data: undefined }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Resend failed')) return { ok: false, error: `Email not sent: ${err.message.replace('Resend failed: ', '')}` }
    return toActionError(err)
  }
}
