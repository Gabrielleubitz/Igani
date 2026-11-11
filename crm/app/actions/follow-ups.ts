'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { toActionError, type ActionResult } from '@/app/actions/result'
import { sendText } from '@/app/actions/sms'
import { completeTask, deleteTask, emailContact } from '@/app/sales/actions'
import { requireUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { coachingLanguage } from '@/lib/call-language'
import { briefLead, type LeadBrief } from '@/lib/lead-brief'
import { assertCanSeeLead } from '@/lib/lead-access'
import { prisma } from '@/lib/prisma'

/** "Brief me": a short recap of everything with this contact, across every channel. */
export async function briefMe(leadId: string): Promise<ActionResult<LeadBrief>> {
  try {
    const user = await requireUser()
    const id = z.string().cuid().parse(leadId)
    await assertCanSeeLead(id, user)
    const me = await prisma.user.findUnique({ where: { id: user.id }, select: { timeZone: true } })
    return { ok: true, data: await briefLead(id, me?.timeZone || 'Asia/Jerusalem') }
  } catch (err) {
    if (err instanceof Error && /OpenAI/.test(err.message)) return { ok: false, error: err.message }
    return toActionError(err)
  }
}

/** A draft its owner (or an admin) may act on. */
async function draftFor(draftId: string) {
  const user = await requireUser()
  const draft = await prisma.followUpDraft.findUnique({ where: { id: z.string().cuid().parse(draftId) } })
  if (!draft) throw new BookingError('This follow-up was not found.', 'NOT_FOUND')
  if (draft.userId !== user.id && user.role !== 'ADMIN') throw new BookingError('This follow-up belongs to someone else.', 'FORBIDDEN')
  if (draft.status !== 'open') throw new BookingError(draft.status === 'sent' ? 'This follow-up was already sent.' : 'This follow-up was dismissed.', 'INVALID_STATE')
  await assertCanSeeLead(draft.leadId, user)
  return draft
}

const SendDraft = z.object({ subject: z.string().trim().max(200).optional(), body: z.string().trim().min(1, 'Write a message').max(10000) })

/** Send a drafted follow-up (as edited) by its channel, then close its task. */
export async function sendFollowUp(draftId: string, input: z.input<typeof SendDraft>): Promise<ActionResult> {
  try {
    const draft = await draftFor(draftId)
    const data = SendDraft.parse(input)
    if (draft.channel === 'email') {
      const r = await emailContact(draft.leadId, { subject: data.subject || draft.subject || 'Following up', body: data.body, lang: coachingLanguage(data.body), followUpDays: 3 })
      if (!r.ok) return r
    } else {
      const lead = await prisma.lead.findUniqueOrThrow({ where: { id: draft.leadId }, select: { phone: true } })
      if (!lead.phone) throw new BookingError('This contact has no phone number.', 'INVALID_STATE')
      const r = await sendText({ to: lead.phone, body: data.body })
      if (!r.ok) return r
      if (r.data.status === 'failed' || r.data.status === 'undelivered') return { ok: false, error: r.data.error ? `Text not sent: ${r.data.error}` : 'Text not sent.' }
    }
    await prisma.followUpDraft.update({ where: { id: draft.id }, data: { status: 'sent', closedAt: new Date(), subject: draft.channel === 'email' ? data.subject || draft.subject : null, body: data.body } })
    await completeTask(draft.leadId, draft.taskId)
    revalidatePath('/sales/today')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Not needed after all: drop the draft and its task. */
export async function dismissFollowUp(draftId: string): Promise<ActionResult> {
  try {
    const draft = await draftFor(draftId)
    await prisma.followUpDraft.update({ where: { id: draft.id }, data: { status: 'dismissed', closedAt: new Date() } })
    await deleteTask(draft.leadId, draft.taskId)
    revalidatePath('/sales/today')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}
