'use server'

import { revalidatePath } from 'next/cache'
import { toActionError, type ActionResult } from '@/app/actions/result'
import { requireUser } from '@/lib/auth'
import { backfillMeetingTasks } from '@/lib/meeting-tasks'
import { importTeamMeetings, type ImportResult } from '@/lib/team-meetings'

/** Admin only: pull team calls from the admin's Google Calendar (last 14 days) and fetch their Gemini notes. */
export async function importTeamMeetingsAction(): Promise<ActionResult<ImportResult>> {
  try {
    const admin = await requireUser(['ADMIN'])
    const r = await importTeamMeetings(admin.id)
    await backfillMeetingTasks().catch((e: unknown) => console.error('[team-meetings] task backfill failed', e))
    revalidatePath('/sales/team-meeting')
    revalidatePath('/sales/tasks')
    return { ok: true, data: r }
  } catch (err) {
    return toActionError(err)
  }
}
