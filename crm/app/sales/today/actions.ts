'use server'

import { revalidatePath } from 'next/cache'
import { toActionError, type ActionResult } from '@/app/actions/result'
import { requireUser } from '@/lib/auth'
import { entryInput, resolveEntryTimes, type EntryInput } from '@/lib/calendar-entries'
import { pushEntryToGoogle, removeEntryFromGoogle } from '@/lib/calendar-entry-sync'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

/** Add a personal event to my calendar on the Today page. */
export async function createCalendarEntry(input: EntryInput): Promise<ActionResult<{ id: string; googleSynced: boolean }>> {
  try {
    const user = await requireUser()
    const v = entryInput.parse(input)
    const me = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } })
    const { startTime, endTime } = resolveEntryTimes(v, me.timeZone)
    const row = await prisma.calendarEntry.create({
      data: { ownerId: user.id, title: v.title, notes: v.notes || null, allDay: v.allDay, color: v.color ?? null, startTime, endTime },
      select: { id: true },
    })
    const googleSynced = await pushEntryToGoogle(row.id)
    revalidatePath('/sales/today')
    return { ok: true, data: { id: row.id, googleSynced } }
  } catch (err) {
    if (err instanceof Error && /^(Pick a valid date|The end must be after the start)$/.test(err.message)) return { ok: false, error: err.message }
    return toActionError(err)
  }
}

/** Remove one of my own calendar entries. */
export async function deleteCalendarEntry(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const entryId = z.string().cuid().parse(id)
    const old = await prisma.calendarEntry.findFirst({ where: { id: entryId, ownerId: user.id }, select: { googleEventId: true } })
    await removeEntryFromGoogle(user.id, old?.googleEventId ?? null)
    await prisma.calendarEntry.deleteMany({ where: { id: entryId, ownerId: user.id } })
    revalidatePath('/sales/today')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}
