import { redirect } from 'next/navigation'
import { MeetHome } from '@/components/meet/MeetHome'
import type { RoomView } from '@/components/meet/MeetAdmin'
import { currentUserOrNull, requireUser } from '@/lib/auth'
import { avatarPath } from '@/lib/avatar'
import { cloudinaryConfigured } from '@/lib/cloudinary'
import { appUrl } from '@/lib/env'
import { meetAvailable, meetConfigured, meetRecordingReady, meetSetupProblem } from '@/lib/meet'
import { canManageMeet } from '@/lib/meet-access'
import { closeExpiredRooms, meetClosesAt } from '@/lib/meet-lifecycle'
import { meetBase, meetUrl } from '@/lib/meet-links'
import { recordingState } from '@/lib/meet-recording'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Igani Meet's home, for signed-in teammates only (no sign-ups: the CRM's whitelist decides who's a member). Everyone
 * can start meetings; each person sees the ones they host or are invited to, admins see all of them.
 */
export default async function MeetHomePage(): Promise<React.ReactElement> {
  const base = await meetBase()
  if (!(await currentUserOrNull())) redirect(`/login?callbackUrl=${encodeURIComponent(base || '/')}`)
  const user = await requireUser()
  const admin = user.role === 'ADMIN'
  const [me, team, rooms] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { id: true, name: true, email: true, image: true, timeZone: true } }),
    prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SALES', 'MARKETING'] }, email: { not: null }, NOT: { id: user.id } }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }),
    prisma.meetRoom.findMany({ where: admin ? {} : { OR: [{ hostId: user.id }, { invites: { some: { userId: user.id } } }] }, orderBy: [{ endedAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }], take: 60, include: { host: { select: { id: true, name: true, email: true } }, invites: { orderBy: { createdAt: 'asc' } }, recordings: { orderBy: { createdAt: 'desc' } } } }),
  ])
  const now = new Date()
  const closed = await closeExpiredRooms(rooms, now)
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: me.timeZone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  const mins = (sec: number | null): string | null => (sec == null ? null : sec < 60 ? `${sec}s` : `${Math.floor(sec / 3600) ? `${Math.floor(sec / 3600)}h ` : ''}${Math.round((sec % 3600) / 60)} min`)
  const views: RoomView[] = rooms.map((r) => ({
    id: r.id,
    code: r.code,
    title: r.title,
    when: r.scheduledAt ? fmt.format(r.scheduledAt) : null,
    durationMin: r.durationMin,
    ended: Boolean(r.endedAt) || closed.has(r.id),
    closes: r.endedAt || closed.has(r.id) ? null : fmt.format(meetClosesAt(r)),
    hostName: r.hostId === user.id ? 'you' : (r.host?.name ?? r.host?.email ?? 'Former teammate'),
    manage: canManageMeet(user, r),
    recordings: r.recordings.map((c) => ({ id: c.id, when: fmt.format(c.startedAt ?? c.createdAt), duration: mins(c.durationSec), state: recordingState(c, now), note: c.error, until: c.sourceUntil ? fmt.format(c.sourceUntil) : null })),
    invites: r.invites.map((i) => ({ id: i.id, email: i.email, name: i.name, teammate: Boolean(i.userId), link: meetUrl(`/${r.code}?t=${encodeURIComponent(i.token)}`), sent: Boolean(i.sentAt), error: i.sendError, joined: Boolean(i.joinedAt) })),
  }))
  return (
    <MeetHome
      me={{ name: me.name ?? me.email ?? 'You', email: me.email ?? '', avatar: avatarPath(me) }}
      admin={admin}
      status={{ configured: meetConfigured(), problem: meetSetupProblem(), ready: meetAvailable(), recording: meetRecordingReady(), storage: cloudinaryConfigured(), webhookUrl: appUrl('/api/public/meet/webhook') }}
      teammates={team.map((t) => ({ id: t.id, name: t.name ?? t.email!, email: t.email!.toLowerCase() }))}
      rooms={views}
    />
  )
}
