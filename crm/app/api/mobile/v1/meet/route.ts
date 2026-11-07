import { createMeetRoom } from '@/app/actions/meet'
import { meetAvailable } from '@/lib/meet'
import { canManageMeet } from '@/lib/meet-access'
import { closeExpiredRooms, meetClosesAt } from '@/lib/meet-lifecycle'
import { meetUrl } from '@/lib/meet-links'
import { fromAction, json, mobileUser } from '@/lib/mobile'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** Igani Meet for the app: the meetings this person hosts or is invited to (admins: all), newest first. */
export async function GET(): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  const admin = user.role === 'ADMIN'
  const rooms = await prisma.meetRoom.findMany({
    where: admin ? {} : { OR: [{ hostId: user.id }, { invites: { some: { userId: user.id } } }] },
    orderBy: [{ endedAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }],
    take: 40,
    include: { host: { select: { name: true, email: true } }, _count: { select: { invites: true, recordings: true } } },
  })
  const now = new Date()
  const closed = await closeExpiredRooms(rooms, now)
  return json({
    ready: meetAvailable(),
    rooms: rooms.map((r) => {
      const ended = Boolean(r.endedAt) || closed.has(r.id)
      return {
        id: r.id,
        code: r.code,
        title: r.title,
        scheduledAt: r.scheduledAt,
        durationMin: r.durationMin,
        ended,
        closesAt: ended ? null : meetClosesAt(r),
        host: r.hostId === user.id ? 'You' : (r.host?.name ?? r.host?.email ?? 'Former teammate'),
        manage: canManageMeet(user, r),
        invites: r._count.invites,
        recordings: r._count.recordings,
        joinUrl: meetUrl(`/${r.code}`),
        createdAt: r.createdAt,
      }
    }),
  })
}

/** Start a meeting now (optionally emailing invites), through the website's own action. */
export async function POST(req: Request): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  const b = (await req.json().catch(() => ({}))) as { title?: string; emails?: string; when?: string; durationMin?: number }
  const r = await createMeetRoom({ title: b.title?.trim() || `${user.name?.split(' ')[0] ?? 'Igani'}’s meeting`, when: b.when ?? '', durationMin: b.durationMin ?? 30, userIds: [], emails: b.emails ?? '', send: true })
  return fromAction(r.ok ? { ok: true, data: { ...r.data, joinUrl: meetUrl(`/${r.data.code}`) } } : r)
}
