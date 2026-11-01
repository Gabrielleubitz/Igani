'use server'

import { revalidatePath } from 'next/cache'
import { toActionError, type ActionResult } from '@/app/actions/result'
import { requireUser } from '@/lib/auth'
import { importTeamMeetings, type ImportResult } from '@/lib/team-meetings'

/** Admin only: pull team calls from the admin's Google Calendar (last 14 days) and fetch their Gemini notes. */
export async function importTeamMeetingsAction(): Promise<ActionResult<ImportResult>> {
  try {
    const admin = await requireUser(['ADMIN'])
    const r = await importTeamMeetings(admin.id)
    revalidatePath('/sales/team-meeting')
    return { ok: true, data: r }
  } catch (err) {
    return toActionError(err)
  }
}
