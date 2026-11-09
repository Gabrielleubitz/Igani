import type { Metadata } from 'next'
import { IganiMeet, MeetClosed } from '@/components/meet/IganiMeet'
import { currentUserOrNull } from '@/lib/auth'
import { avatarPath } from '@/lib/avatar'
import { meetScriptUrl } from '@/lib/meet'
import { canManageMeet } from '@/lib/meet-access'
import { closeExpiredRooms } from '@/lib/meet-lifecycle'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = { robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/**
 * Igani Meet: the call page. Guests come with the personal link from their invite (?t=…); teammates can open it signed
 * in. Nothing about the room is shown to someone without a valid way in.
 */
export default async function MeetPage(props: { params: Promise<{ code: string }>; searchParams: Promise<{ t?: string }> }): Promise<React.ReactElement> {
  const { code } = await props.params
  const { t } = await props.searchParams
  const token = typeof t === 'string' && t.length <= 100 ? t : null
  const [room, user] = await Promise.all([
    prisma.meetRoom.findUnique({ where: { code: code.slice(0, 60) }, select: { id: true, title: true, endedAt: true, hostId: true, scheduledAt: true, durationMin: true, createdAt: true, lastActiveAt: true, host: { select: { id: true, name: true, image: true } } } }),
    currentUserOrNull(),
  ])
  // a room whose time is up closes now, so its links stop working (see lib/meet-lifecycle.ts)
  if (room && !room.endedAt && (await closeExpiredRooms([room])).size) room.endedAt = new Date()
  const invite = room && token ? await prisma.meetInvite.findFirst({ where: { token, roomId: room.id }, select: { name: true, email: true, userId: true } }) : null
  const invitedUser = room && user && !invite ? await prisma.meetInvite.findFirst({ where: { roomId: room.id, userId: user.id }, select: { id: true } }) : null
  const manages = Boolean(room && user && canManageMeet(user, room))
  const allowed = Boolean(room && !room.endedAt && (invite || manages || invitedUser))
  if (!room || !allowed) {
    return (
      <MeetClosed
        title={!room ? 'This call link isn’t valid' : room.endedAt ? 'This call has ended' : 'You need an invite to join'}
        body={!room ? 'Check the link in your invite, or ask the person who invited you for a new one.' : room.endedAt ? 'The host ended this call. Ask them for a new link if you need to talk.' : 'Open the personal link from your invite email to join this call.'}
      />
    )
  }
  const me = user ? await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, name: true, email: true, image: true } }) : null
  const asTeammate = Boolean(me && (!invite || invite.userId === user!.id || invite.email === me.email?.toLowerCase()))
  return (
    <IganiMeet
      code={code}
      token={token}
      title={room.title}
      hostName={room.hostId === user?.id ? null : (room.host?.name ?? null)}
      defaultName={asTeammate ? (me?.name ?? me?.email ?? '') : (invite?.name ?? '')}
      email={asTeammate ? (me?.email ?? null) : (invite?.email ?? null)}
      nameEditable={!asTeammate}
      isHost={room.hostId === user?.id}
      scriptUrl={meetScriptUrl()}
      avatar={asTeammate && me ? avatarPath(me) : null}
      hostAvatar={room.host ? avatarPath(room.host) : null}
      startsAt={room.scheduledAt?.toISOString() ?? null}
      durationMin={room.durationMin}
      roomId={manages ? room.id : null}
      isMember={Boolean(user)}
    />
  )
}
