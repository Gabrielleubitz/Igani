'use server'

import { removeTaskCalendarEntry } from '@/lib/team-tasks'
import { aiTidyEnabled, tidyWithAI } from '@/lib/meeting-ai'
import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { syncCalendarChanges } from '@/lib/calendar-sync'
import { z } from 'zod'
import { toActionError, type ActionResult } from '@/app/actions/result'
import { TASK_PRIORITIES, type TaskPriority } from '@/components/crm/crm-utils'
import { logActivity } from '@/lib/audit'
import { requireUser, type SessionUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { sendContactEmail } from '@/lib/email'
import { assertCanSeeLead } from '@/lib/lead-access'
import { prisma } from '@/lib/prisma'
import { setMeetingTaskDone } from '@/lib/meeting-tasks'
import { loadTasks } from '@/lib/tasks'
import { formatDateTime } from '@/lib/format'
import { GmailNotConnectedError, hasGmailAccess } from '@/lib/google'
import { syncMailbox } from '@/lib/mail-sync'
import { syncDueMeetings, syncMeeting } from '@/lib/meetings'

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

/**
 * A task can go to an admin or to the lead's own owner: those are the only people who can open the lead. Anyone else
 * could not see the task, and the reminder email would name a client they cannot open.
 */
async function assertAssignable(assigneeId: string | null, leadId: string): Promise<void> {
  if (!assigneeId) return
  const u = await prisma.user.findUnique({ where: { id: assigneeId }, select: { role: true } })
  if (!u?.role) throw new BookingError('That teammate no longer has access.', 'INVALID_STATE')
  if (u.role === 'ADMIN') return
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { assignedToId: true } })
  if (lead?.assignedToId !== assigneeId) throw new BookingError('You can give a task to an admin or to the lead’s owner.', 'FORBIDDEN')
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
    await assertAssignable(assignee, id)
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
    await removeTaskCalendarEntry(tid) // a block it put on someone's calendar goes with it
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
    if (ch.assigneeId !== undefined) await assertAssignable(ch.assigneeId, id)
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
  lang: z.enum(['en', 'he']).default('en'),
  /** EmailMessage id being replied to */
  replyToId: z.string().cuid().optional(),
})

/**
 * Send a branded Igani email to the contact from inside the CRM. Replies go to the sender's own inbox (and, with Gmail
 * connected, come back into the CRM). Logged on the timeline and stored in the contact's email conversation.
 */
export async function emailContact(leadId: string, input: z.input<typeof emailSchema>): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const id = z.string().cuid().parse(leadId)
    const data = emailSchema.parse(input)
    await assertCanSeeLead(id, user)
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id }, select: { email: true, firstName: true } })
    if (!lead.email) throw new BookingError('This contact has no email address yet. Add one under Edit details first.', 'INVALID_STATE')
    const original = data.replyToId ? await prisma.emailMessage.findFirst({ where: { id: data.replyToId, leadId: id } }) : null
    if (data.replyToId && !original) throw new BookingError('The email you are replying to was not found.', 'NOT_FOUND')
    const me = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } })
    const emailId = await sendContactEmail({
      to: lead.email,
      subject: data.subject,
      body: data.body,
      firstName: lead.firstName,
      senderName: user.name ?? user.email,
      senderEmail: user.email,
      cta: data.cta,
      lang: data.lang,
      inReplyTo: original
        ? { messageIdHeader: original.messageIdHeader, quote: { from: original.fromName ?? original.fromEmail, sentAt: formatDateTime(original.sentAt, me.timeZone), text: original.bodyText } }
        : undefined,
    })
    await prisma.$transaction(async (tx) => {
      const row = await tx.emailMessage.create({
        data: {
          leadId: id,
          mailboxUserId: user.id,
          externalId: `resend:${emailId}`,
          dedupeKey: `resend:${emailId}`,
          threadId: original?.threadId ?? null,
          direction: 'OUTBOUND',
          fromEmail: user.email.toLowerCase(),
          fromName: user.name,
          toEmails: [lead.email!.toLowerCase()],
          subject: data.subject,
          snippet: data.body.replace(/\s+/g, ' ').slice(0, 200),
          bodyText: data.body.slice(0, 20000),
          sentAt: new Date(),
        },
      })
      await logActivity({ entityType: 'LEAD', entityId: id, actorId: user.id, action: 'email.sent', metadata: { subject: data.subject, body: data.body.slice(0, 2000), emailId: row.id, via: 'crm' } }, tx)
      // Replying counts as dealing with their email.
      if (original?.direction === 'INBOUND') await tx.emailMessage.updateMany({ where: { leadId: id, direction: 'INBOUND', readAt: null }, data: { readAt: new Date() } })
    })
    refresh(id)
    return { ok: true, data: undefined }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Resend failed')) return { ok: false, error: `Email not sent: ${err.message.replace('Resend failed: ', '')}` }
    return toActionError(err)
  }
}

/** Pull new emails from the signed-in user's Gmail now (throttled to once every 2 minutes). */
export async function syncMyEmail(force = false): Promise<ActionResult<{ stored: number; inbound: number; connected: boolean }>> {
  try {
    const user = await requireUser()
    if (!(await hasGmailAccess(user.id))) return { ok: true, data: { stored: 0, inbound: 0, connected: false } }
    const state = await prisma.mailboxSync.findUnique({ where: { userId: user.id } })
    if (!force && state?.lastSyncedAt && Date.now() - state.lastSyncedAt.getTime() < 2 * 60_000) return { ok: true, data: { stored: 0, inbound: 0, connected: true } }
    const r = await syncMailbox(user.id)
    if (r.stored) revalidatePath('/sales', 'layout')
    return { ok: true, data: { stored: r.stored, inbound: r.inbound, connected: true } }
  } catch (err) {
    if (err instanceof GmailNotConnectedError) return { ok: true, data: { stored: 0, inbound: 0, connected: false } }
    console.error('[mail-sync] manual sync failed', err)
    return { ok: false, error: 'Could not reach Gmail right now. Try again in a minute.' }
  }
}

/** Mark a contact's unread client emails as read (called when the contact's owner opens the contact). */
export async function markEmailsRead(leadId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const id = z.string().cuid().parse(leadId)
    const lead = await assertCanSeeLead(id, user)
    if (lead.assignedToId && lead.assignedToId !== user.id) return { ok: true, data: undefined }
    await prisma.emailMessage.updateMany({ where: { leadId: id, direction: 'INBOUND', readAt: null }, data: { readAt: new Date() } })
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/**
 * Check Google Meet calls in the background when a page opens: real start/end and Gemini notes.
 * One contact's calls (if `leadId`), else the signed-in user's own hosted calls. Each call is looked at most once a minute.
 */
export async function syncMeetings(leadId?: string): Promise<ActionResult<{ checked: number }>> {
  try {
    const user = await requireUser()
    if (leadId) await assertCanSeeLead(z.string().cuid().parse(leadId), user)
    const cal = await syncCalendarChanges({ ...(leadId ? { leadId } : { hostId: user.id }), limit: 30 }) // Google → CRM: cancelled/moved events
    const r = await syncDueMeetings({ ...(leadId ? { leadId } : { hostId: user.id }), limit: 10, minGapMs: 60_000 })
    if (r.checked || cal.cancelled || cal.moved) refresh(leadId)
    return { ok: true, data: { checked: r.checked } }
  } catch (err) {
    return toActionError(err)
  }
}

/** "Tidy with AI" on a call whose notes are already pulled in (needs OPENAI_API_KEY). */
export async function tidyMeetingNotes(bookingId: string): Promise<ActionResult<{ ok: true }>> {
  try {
    const user = await requireUser()
    const id = z.string().cuid().parse(bookingId)
    const b = await prisma.booking.findUnique({ where: { id }, select: { hostId: true, leadId: true, source: true, meeting: { select: { id: true, fullText: true } } } })
    if (!b?.meeting?.fullText) return { ok: false, error: 'No notes to tidy yet.' }
    if (b.source === 'TEAM_MEETING' && user.role !== 'ADMIN') return { ok: false, error: 'Meeting not found.' }
    if (b.leadId) await assertCanSeeLead(b.leadId, user)
    else if (b.hostId !== user.id && user.role !== 'ADMIN') return { ok: false, error: 'Meeting not found.' }
    if (!aiTidyEnabled()) return { ok: false, error: 'AI tidy-up is not switched on (no OpenAI key).' }
    const roster = await prisma.user.findMany({ where: { role: { not: null } }, select: { name: true } })
    const organized = await tidyWithAI(b.meeting.fullText, roster.map((u) => (u.name ?? '').trim().split(/\s+/)[0] ?? '').filter(Boolean))
    if (!organized) return { ok: false, error: 'The AI tidy-up failed. Try again in a moment.' }
    await prisma.meetingSession.update({ where: { id: b.meeting.id }, data: { organizedJson: organized } })
    refresh(b.leadId ?? undefined)
    return { ok: true, data: { ok: true } }
  } catch (err) {
    return toActionError(err)
  }
}

/** "Check again" on a call: look for its Gemini notes right now (also after we gave up). */
export async function recheckMeetingNotes(bookingId: string): Promise<ActionResult<{ status: string | null }>> {
  try {
    const user = await requireUser()
    const id = z.string().cuid().parse(bookingId)
    const b = await prisma.booking.findUnique({ where: { id }, select: { hostId: true, leadId: true, source: true } })
    if (!b) return { ok: false, error: 'Meeting not found.' }
    if (b.source === 'TEAM_MEETING' && user.role !== 'ADMIN') return { ok: false, error: 'Meeting not found.' }
    if (b.leadId) await assertCanSeeLead(b.leadId, user)
    else if (b.hostId !== user.id && user.role !== 'ADMIN') return { ok: false, error: 'Meeting not found.' }
    const s = await syncMeeting(id, { force: true })
    refresh(b.leadId ?? undefined)
    return { ok: true, data: { status: s?.notesStatus ?? null } }
  } catch (err) {
    return toActionError(err)
  }
}

/** Admin: remove an imported team call so it can be imported again from Google Calendar. */
export async function deleteTeamMeeting(bookingId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    if (user.role !== 'ADMIN') return { ok: false, error: 'Only admins can delete team meetings.' }
    const id = z.string().cuid().parse(bookingId)
    const b = await prisma.booking.findUnique({ where: { id }, select: { source: true, title: true } })
    if (!b || b.source !== 'TEAM_MEETING') return { ok: false, error: 'Only imported team meetings can be deleted.' }
    await prisma.booking.delete({ where: { id } })
    await logActivity({ entityType: 'BOOKING', entityId: id, action: 'team_meeting.deleted', actorId: user.id })
    refresh()
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Tick / untick a meeting action item on someone's task list. */
export async function setMeetingTask(ownerId: string, taskId: string, done: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await setMeetingTaskDone(user, z.string().cuid().parse(ownerId), z.string().uuid().parse(taskId), done)
    refresh()
    revalidatePath('/admin/dashboard')
    return { ok: true, data: undefined }
  } catch (err) {
    if (err instanceof Error && (err.message === 'Not your task.' || err.message === 'Task not found.')) return { ok: false, error: err.message }
    return toActionError(err)
  }
}
