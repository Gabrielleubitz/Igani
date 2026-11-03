'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { TASK_PRIORITIES } from '@/components/crm/crm-utils'
import { logActivity } from '@/lib/audit'
import { requireUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { pushEntryToGoogle } from '@/lib/calendar-entry-sync'
import { appUrl } from '@/lib/env'
import { leadName } from '@/lib/format'
import { canSeeLead } from '@/lib/lead-access'
import { prisma } from '@/lib/prisma'
import { loadTeamTasks, removeTaskCalendarEntry } from '@/lib/team-tasks'
import { toActionError, type ActionResult } from './result'

const refresh = (leadId?: string | null): void => {
  revalidatePath('/sales/tasks')
  revalidatePath('/sales/today')
  if (leadId) revalidatePath(`/sales/leads/${leadId}`)
}

const NewTask = z.object({
  title: z.string().trim().min(1, 'Give the task a title').max(200),
  priority: z.enum(TASK_PRIORITIES).default('MEDIUM'),
  dueAt: z.string().datetime().nullable(),
  assigneeId: z.string().cuid(),
  /** Optional: about a contact. Without it the task is a team task on the assignee. */
  leadId: z.string().cuid().nullable(),
  /** Also put a block on the assignee's calendar (Today + their Google Calendar) at the due time */
  addToCalendar: z.boolean().default(false),
  durationMin: z.number().int().min(5).max(12 * 60).default(30),
  notes: z.string().trim().max(2000).optional(),
})

/**
 * Create a task for yourself or (admins) for anyone, about a contact or not, optionally blocked out on their calendar.
 * Non-admins can give a contact task to an admin or the contact's owner (same rule as on the contact page) and a team task
 * only to themselves.
 */
export async function createTaskFor(input: z.input<typeof NewTask>): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const t = NewTask.parse(input)
    const isAdmin = user.role === 'ADMIN'
    const assignee = await prisma.user.findUnique({ where: { id: t.assigneeId }, select: { id: true, name: true, email: true, role: true } })
    if (!assignee?.role) throw new BookingError('That teammate no longer has access.', 'INVALID_STATE')

    let lead: { id: string; assignedToId: string | null; firstName: string | null; lastName: string | null; email: string | null; company: string | null } | null = null
    if (t.leadId) {
      lead = await prisma.lead.findUnique({ where: { id: t.leadId }, select: { id: true, assignedToId: true, firstName: true, lastName: true, email: true, company: true } })
      if (!lead || !canSeeLead(user, lead)) throw new BookingError('Contact not found.', 'NOT_FOUND')
      // Whoever gets it must be able to open the contact
      if (assignee.role !== 'ADMIN' && lead.assignedToId !== assignee.id) throw new BookingError('A contact task can go to an admin or to the contact’s owner. Pick one of them, or leave the contact empty for a team task.', 'FORBIDDEN')
    } else if (!isAdmin && assignee.id !== user.id) {
      throw new BookingError('Only admins can give team tasks to someone else.', 'FORBIDDEN')
    }
    if (t.addToCalendar && !t.dueAt) throw new BookingError('Pick a due date and time to put it on the calendar.', 'INVALID_STATE')

    const taskId = randomUUID()
    let calendarEntryId: string | undefined
    if (t.addToCalendar && t.dueAt) {
      const start = new Date(t.dueAt)
      const by = assignee.id === user.id ? null : user.name ?? user.email
      const notes = [t.notes, lead ? `Contact: ${leadName(lead)}${lead.company ? ` (${lead.company})` : ''} ${appUrl(`/sales/leads/${lead.id}`)}` : null, by ? `Assigned by ${by} in the Igani CRM` : null, `Tasks: ${appUrl('/sales/tasks')}`]
        .filter(Boolean)
        .join('\n')
      const entry = await prisma.calendarEntry.create({
        data: { ownerId: assignee.id, title: `Task: ${t.title}`, notes, startTime: start, endTime: new Date(start.getTime() + t.durationMin * 60_000), color: 'amber' },
        select: { id: true },
      })
      calendarEntryId = entry.id
    }

    await logActivity({
      entityType: lead ? 'LEAD' : 'USER',
      entityId: lead ? lead.id : assignee.id,
      actorId: user.id,
      action: 'task.created',
      metadata: {
        taskId,
        title: t.title,
        dueAt: t.dueAt,
        assigneeId: assignee.id,
        priority: t.priority,
        ...(lead ? {} : { auto: 'team' }),
        ...(calendarEntryId ? { calendarEntryId } : {}),
        ...(t.notes ? { notes: t.notes } : {}),
      },
    })
    // Google is best effort: without a connected Google account the block still shows on their CRM calendar,
    // and it syncs the next time they open Today after connecting.
    if (calendarEntryId) await pushEntryToGoogle(calendarEntryId).catch(() => false)
    refresh(lead?.id)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Delete a team task: its owner, an admin, or whoever created it. Its calendar block goes too. */
export async function deleteTeamTask(ownerId: string, taskId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const owner = z.string().cuid().parse(ownerId)
    const tid = z.string().uuid().parse(taskId)
    const task = (await loadTeamTasks(owner)).find((x) => x.id === tid)
    if (!task) throw new BookingError('Task not found (it may have been deleted).', 'NOT_FOUND')
    if (user.role !== 'ADMIN' && user.id !== owner && user.id !== task.createdById) throw new BookingError('Not your task.', 'FORBIDDEN')
    await logActivity({ entityType: 'USER', entityId: owner, actorId: user.id, action: 'task.deleted', metadata: { taskId: tid } })
    await removeTaskCalendarEntry(tid)
    refresh()
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}
