'use server'

import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { allowedTeammates, busyIntervalsFor } from '@/lib/bookings'
import { getAvailableSlots } from '@/lib/calendar'
import { assertCanSeeLead } from '@/lib/lead-access'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'
import { toActionError, type ActionResult } from './result'

/** What the in-call "Book" panel needs: the client's email and who can join. */
export async function callBookingInfo(leadId: string): Promise<ActionResult<{ email: string | null; guestName: string; teammates: { id: string; name: string }[]; timeZone: string }>> {
  try {
    const user = await requireUser(['ADMIN', 'SALES'])
    const id = z.string().cuid().parse(leadId)
    await assertCanSeeLead(id, user)
    const [lead, me, team] = await Promise.all([prisma.lead.findUniqueOrThrow({ where: { id }, select: { email: true, firstName: true, lastName: true, company: true, phone: true } }), prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } }), allowedTeammates(user, user.id)])
    const guestName = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.company || lead.phone || 'Client'
    return { ok: true, data: { email: lead.email, guestName, teammates: team.map((t) => ({ id: t.id, name: t.name ?? t.email })), timeZone: me.timeZone || 'Asia/Jerusalem' } }
  } catch (err) {
    return toActionError(err)
  }
}

const FreeTimes = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), durationMinutes: z.number().int().min(15).max(240), teammateIds: z.array(z.string().cuid()).max(6) })

/**
 * Start times (ISO) on a day when the caller AND every chosen teammate are free (meetings in the CRM and their Google
 * Calendars), between 07:00 and 22:00 in the caller's time zone. `unchecked` = teammates whose calendar couldn't be read.
 */
export async function freeTimesWithTeam(input: z.input<typeof FreeTimes>): Promise<ActionResult<{ slots: string[]; unchecked: string[] }>> {
  try {
    const user = await requireUser(['ADMIN', 'SALES'])
    const data = FreeTimes.parse(input)
    const allowed = new Map((await allowedTeammates(user, user.id)).map((t) => [t.id, t.name ?? t.email]))
    const ids = data.teammateIds.filter((id) => allowed.has(id))
    const me = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } })
    const tz = me.timeZone || 'Asia/Jerusalem'
    const hour = (iso: string): number => Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(new Date(iso)))
    const mine = (await getAvailableSlots(user.id, new Date(`${data.date}T00:00:00Z`), data.durationMinutes)).filter((s) => hour(s) >= 7 && hour(s) < 22)
    if (!mine.length || !ids.length) return { ok: true, data: { slots: mine, unchecked: [] } }
    const from = new Date(mine[0]!)
    const to = new Date(new Date(mine[mine.length - 1]!).getTime() + data.durationMinutes * 60_000)
    const pad = (await getSetting('booking.bufferMinutes')) * 60_000
    const people = await Promise.all(ids.map(async (id) => ({ id, ...(await busyIntervalsFor(id, new Date(from.getTime() - pad), new Date(to.getTime() + pad))) })))
    const slots = mine.filter((s) => {
      const a = new Date(s).getTime() - pad
      const b = new Date(s).getTime() + data.durationMinutes * 60_000 + pad
      return people.every((p) => p.busy.every((x) => x.end.getTime() <= a || x.start.getTime() >= b))
    })
    return { ok: true, data: { slots, unchecked: people.filter((p) => !p.google).map((p) => allowed.get(p.id) ?? 'A teammate') } }
  } catch (err) {
    return toActionError(err)
  }
}
