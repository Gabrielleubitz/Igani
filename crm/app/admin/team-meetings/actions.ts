'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { toActionError, type ActionResult } from '@/app/actions/result'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createTeamMeeting, importTeamMeetings } from '@/lib/team-meetings'

const schema = z.object({
  title: z.string().trim().min(1).max(200),
  startTime: z.string().datetime(),
  durationMinutes: z.coerce.number().int().min(15).max(480),
  attendeeIds: z.array(z.string().cuid()).max(100),
  notes: z.string().trim().max(2000).optional(),
})

/** Admin only (checked here, not just by hiding the page): book a Google Meet with teammates. */
export async function bookTeamMeeting(input: z.input<typeof schema>): Promise<ActionResult<{ meetUrl: string | null }>> {
  try {
    const admin = await requireUser(['ADMIN'])
    const v = schema.parse(input)
    const start = new Date(v.startTime)
    if (start.getTime() < Date.now() - 5 * 60_000) return { ok: false, error: 'Pick a time in the future.' }
    const people = await prisma.user.findMany({ where: { id: { in: v.attendeeIds } }, select: { email: true } })
    const row = await createTeamMeeting({ hostId: admin.id, title: v.title, start, end: new Date(start.getTime() + v.durationMinutes * 60_000), attendeeEmails: people.flatMap((p) => (p.email ? [p.email] : [])), notes: v.notes })
    revalidatePath('/admin/team-meetings')
    return { ok: true, data: { meetUrl: row.meetUrl } }
  } catch (err) {
    return toActionError(err)
  }
}

/** Admin only: pull team calls from the admin's Google Calendar (last 14 days) and fetch their Gemini notes. */
export async function importTeamMeetingsAction(): Promise<ActionResult<{ found: number; imported: number; withNotes: number }>> {
  try {
    const admin = await requireUser(['ADMIN'])
    const r = await importTeamMeetings(admin.id)
    revalidatePath('/admin/team-meetings')
    return { ok: true, data: r }
  } catch (err) {
    return toActionError(err)
  }
}
