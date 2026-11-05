import type { Metadata } from 'next'
import { IganiMeet } from '@/components/meet/IganiMeet'
import { currentUserOrNull } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = { title: { absolute: 'Igani Meet' }, robots: { index: false, follow: false } }
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
    prisma.meetRoom.findUnique({ where: { code: code.slice(0, 60) }, select: { id: true, title: true, endedAt: true, hostId: true, host: { select: { name: true } } } }),
    currentUserOrNull(),
  ])
  const invite = room && token ? await prisma.meetInvite.findFirst({ where: { token, roomId: room.id }, select: { name: true, email: true, userId: true } }) : null
  const invitedUser = room && user && !invite ? await prisma.meetInvite.findFirst({ where: { roomId: room.id, userId: user.id }, select: { id: true } }) : null
  const allowed = Boolean(room && !room.endedAt && (invite || user?.role === 'ADMIN' || invitedUser))
  if (!room || !allowed) {
    return (
      <IganiMeet.Closed
        title={!room ? 'This call link isn’t valid' : room.endedAt ? 'This call has ended' : 'You need an invite to join'}
        body={!room ? 'Check the link in your invite, or ask the person who invited you for a new one.' : room.endedAt ? 'The host ended this call. Ask them for a new link if you need to talk.' : 'Open the personal link from your invite email to join this call.'}
      />
    )
  }
  const me = user ? await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true } }) : null
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
    />
  )
}
