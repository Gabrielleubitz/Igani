'use server'

import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createTask } from '@/app/sales/actions'
import { requireUser } from '@/lib/auth'
import { resolveEntryTimes } from '@/lib/calendar-entries'
import { pushEntryToGoogle } from '@/lib/calendar-entry-sync'
import { leadName } from '@/lib/format'
import { assertCanSeeLead } from '@/lib/lead-access'
import { checkProfileSite, enrichLeadFromCall, readProfile, type LeadProfile } from '@/lib/lead-intel'
import { prisma } from '@/lib/prisma'
import { zonedInputToDate } from '@/lib/time'
import { toActionError, type ActionResult } from './result'

const id = z.string().regex(/^[a-z0-9]{6,40}$/i)

async function load(leadId: string) {
  const user = await requireUser()
  await assertCanSeeLead(id.parse(leadId), user)
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId }, select: { id: true, firstName: true, lastName: true, email: true, company: true, phone: true, profile: true } })
  return { user, lead, profile: readProfile(lead.profile) }
}

async function save(leadId: string, profile: LeadProfile): Promise<void> {
  await prisma.lead.update({ where: { id: leadId }, data: { profile: profile as unknown as Prisma.InputJsonValue } })
  revalidatePath(`/sales/leads/${leadId}`)
}

/** A time booked on a call → an event on your calendar (and Google Calendar, when connected). */
export async function addProfileMeetingToCalendar(leadId: string, meetingId: string): Promise<ActionResult<{ entryId: string; googleSynced: boolean }>> {
  try {
    const { user, lead, profile } = await load(leadId)
    const m = profile?.meetings.find((x) => x.id === id.parse(meetingId))
    if (!profile || !m) return { ok: false, error: 'That meeting is no longer on the profile.' }
    if (m.entryId && (await prisma.calendarEntry.findUnique({ where: { id: m.entryId }, select: { id: true } }))) return { ok: true, data: { entryId: m.entryId, googleSynced: false } }
    const who = leadName(lead)
    const how = m.kind === 'video' ? 'Video call' : m.kind === 'in_person' ? 'Meeting' : 'Call'
    const { startTime, endTime } = resolveEntryTimes({ allDay: false, start: m.when, durationMin: m.durationMin }, m.timeZone)
    const notes = [m.topic, lead.phone ? `Phone: ${lead.phone}` : null, m.quote ? `On the call: “${m.quote}”` : null, `Lead: ${process.env.NEXTAUTH_URL ?? 'https://app.igani.co'}/sales/leads/${lead.id}`].filter(Boolean).join('\n')
    const row = await prisma.calendarEntry.create({ data: { ownerId: user.id, title: `${how} with ${who}${lead.company ? ` (${lead.company})` : ''}`, notes, allDay: false, startTime, endTime, color: 'blue' }, select: { id: true } })
    const googleSynced = await pushEntryToGoogle(row.id).catch(() => false)
    m.entryId = row.id
    await save(lead.id, profile)
    revalidatePath('/sales/today')
    return { ok: true, data: { entryId: row.id, googleSynced } }
  } catch (err) {
    return toActionError(err)
  }
}

/** A next step from a call → a task on the lead (due when the call said, else today). */
export async function profileItemToTask(leadId: string, itemId: string): Promise<ActionResult> {
  try {
    const { lead, profile } = await load(leadId)
    const item = profile?.actionItems.find((x) => x.id === id.parse(itemId))
    if (!profile || !item) return { ok: false, error: 'That next step is no longer on the profile.' }
    const tz = profile.meetings[0]?.timeZone ?? 'Asia/Jerusalem'
    const due = item.due ? zonedInputToDate(item.due.length === 10 ? `${item.due}T09:00` : item.due, tz).toISOString() : null
    const r = await createTask(lead.id, item.owner === 'client' ? `Follow up: ${item.text}` : item.text, due, 'MEDIUM')
    if (!r.ok) return r
    item.status = 'tasked'
    await save(lead.id, profile)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Tick off (or bring back) a next step without making a task. */
export async function setProfileItem(leadId: string, itemId: string, status: 'open' | 'done' | 'dismissed'): Promise<ActionResult> {
  try {
    const { lead, profile } = await load(leadId)
    const item = profile?.actionItems.find((x) => x.id === id.parse(itemId))
    if (!profile || !item) return { ok: false, error: 'That next step is no longer on the profile.' }
    item.status = z.enum(['open', 'done', 'dismissed']).parse(status)
    await save(lead.id, profile)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Build (or rebuild) the profile from the lead's reviewed calls, oldest first, and check its website. */
export async function rebuildLeadProfile(leadId: string): Promise<ActionResult<{ calls: number }>> {
  try {
    const { lead } = await load(leadId)
    const calls = await prisma.call.findMany({ where: { leadId: lead.id, analysisStatus: 'ready', transcript: { not: null as unknown as Prisma.JsonNullValueFilter } }, orderBy: { startedAt: 'asc' }, take: 6, select: { id: true, transcript: true, analysis: true } })
    for (const c of calls) {
      const lines = Array.isArray(c.transcript) ? (c.transcript as unknown as { start: number; end: number; text: string; speaker: 'rep' | 'client' }[]) : []
      const reviewIn = (c.analysis as { reviewIn?: 'he' | 'en' } | null)?.reviewIn ?? 'en'
      await enrichLeadFromCall(c.id, lines, reviewIn)
    }
    const fresh = await prisma.lead.findUnique({ where: { id: lead.id }, select: { website: true, profile: true } })
    const p = readProfile(fresh?.profile)
    const url = fresh?.website ?? p?.fields.website?.value
    if (url && !p?.siteCheck) await checkProfileSite(lead.id, url)
    revalidatePath(`/sales/leads/${lead.id}`)
    return { ok: true, data: { calls: calls.length } }
  } catch (err) {
    return toActionError(err)
  }
}
