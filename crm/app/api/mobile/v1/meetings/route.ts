import { allowedTeammates } from '@/lib/bookings'
import { leadName } from '@/lib/format'
import { leadScope } from '@/lib/lead-access'
import { notArchivedBy } from '@/lib/lead-archive'
import { fail, json, mobileUser } from '@/lib/mobile'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'

export const dynamic = 'force-dynamic'

/**
 * What the app's two booking screens need: "Book meeting with client" (contacts with an email, hosts for admins) and
 * "Book meeting with team" (who you may add), plus my upcoming meetings and whether Google is connected.
 */
export async function GET(): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  if (user.role !== 'ADMIN' && user.role !== 'SALES') return fail('Booking is for the sales team.', 403)
  const now = new Date()
  const [leads, hosts, google, duration, teammates, upcoming] = await Promise.all([
    prisma.lead.findMany({
      where: { AND: [leadScope(user), { ...notArchivedBy(user.id), email: { not: null }, status: { notIn: ['WON', 'LOST'] } }] },
      orderBy: { updatedAt: 'desc' },
      take: 300,
      select: { id: true, email: true, firstName: true, lastName: true, company: true },
    }),
    user.role === 'ADMIN' ? prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SALES'] } }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }) : Promise.resolve([]),
    prisma.account.findFirst({ where: { userId: user.id, provider: 'google', refresh_token: { not: null } }, select: { id: true } }),
    getSetting('booking.defaultDurationMinutes'),
    allowedTeammates(user, user.id),
    prisma.booking.findMany({
      where: { hostId: user.id, endTime: { gte: now }, status: { in: ['PENDING', 'CONFIRMED'] } },
      orderBy: { startTime: 'asc' },
      take: 30,
      select: { id: true, title: true, guestName: true, guestEmail: true, startTime: true, endTime: true, status: true, meetUrl: true, leadId: true },
    }),
  ])
  return json({
    google: Boolean(google),
    duration,
    adminsOnly: user.role !== 'ADMIN',
    leads: leads.map((l) => ({ id: l.id, name: leadName(l), email: l.email ?? '', company: l.company })),
    hosts: hosts.map((h) => ({ id: h.id, name: h.id === user.id ? `${h.name ?? h.email} (me)` : (h.name ?? h.email ?? h.id) })),
    teammates: teammates.map((t) => ({ id: t.id, name: t.name ?? t.email, email: t.email })),
    upcoming: upcoming.map((b) => ({ id: b.id, title: b.title, guest: b.guestName, email: b.guestEmail, start: b.startTime, end: b.endTime, status: b.status, meetUrl: b.meetUrl, leadId: b.leadId })),
  })
}
