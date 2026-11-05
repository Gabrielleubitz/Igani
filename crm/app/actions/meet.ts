'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { currentUserOrNull, requireUser } from '@/lib/auth'
import { avatarPath } from '@/lib/avatar'
import { sendMeetInviteEmail } from '@/lib/email'
import { appUrl } from '@/lib/env'
import { meetAvailable, meetConfigFor, meetSetupProblem, newInviteToken, newRoomCode, parseInviteEmails, type MeetConfig } from '@/lib/meet'
import { prisma } from '@/lib/prisma'
import { zonedInputToDate } from '@/lib/time'
import { toActionError, type ActionResult } from './result'

const PAGE = '/admin/tests'

const RoomInput = z.object({
  title: z.string().trim().min(1, 'Give the call a name').max(120),
  /** datetime-local value in the host's time zone, or '' for "start now / any time" */
  when: z.string().max(40).default(''),
  durationMin: z.coerce.number().int().min(5).max(480).default(30),
  userIds: z.array(z.string().max(60)).max(50).default([]),
  emails: z.string().max(5000).default(''),
  send: z.boolean().default(true),
})

/** Teammates (by id) plus outside addresses, deduplicated by email. */
async function people(userIds: string[], emails: string): Promise<{ email: string; name: string | null; userId: string | null }[]> {
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true, name: true } }) : []
  const out = new Map<string, { email: string; name: string | null; userId: string | null }>()
  for (const u of users) if (u.email) out.set(u.email.toLowerCase(), { email: u.email.toLowerCase(), name: u.name, userId: u.id })
  const known = new Map((await prisma.user.findMany({ where: { email: { in: parseInviteEmails(emails).map((e) => e.email), mode: 'insensitive' } }, select: { id: true, email: true, name: true } })).map((u) => [u.email!.toLowerCase(), u]))
  for (const e of parseInviteEmails(emails)) {
    if (out.has(e.email)) continue
    const u = known.get(e.email)
    out.set(e.email, { email: e.email, name: e.name ?? u?.name ?? null, userId: u?.id ?? null })
  }
  return [...out.values()]
}

/** Emails each invite its personal link; records when it went out or why it didn't. */
async function sendInvites(roomId: string, inviteIds: string[]): Promise<{ sent: number; failed: number }> {
  const room = await prisma.meetRoom.findUniqueOrThrow({ where: { id: roomId }, include: { host: { select: { name: true, email: true, timeZone: true } }, invites: { where: { id: { in: inviteIds } } } } })
  let sent = 0
  let failed = 0
  for (const inv of room.invites) {
    try {
      await sendMeetInviteEmail({
        to: inv.email,
        guestName: inv.name,
        title: room.title,
        hostName: room.host?.name ?? 'Igani',
        hostEmail: room.host?.email ?? 'hello@igani.co',
        joinUrl: appUrl(`/meet/${room.code}?t=${encodeURIComponent(inv.token)}`),
        start: room.scheduledAt,
        durationMin: room.durationMin,
        timeZone: room.host?.timeZone ?? 'Asia/Jerusalem',
        uid: `meet-${room.id}-${inv.id}`,
      })
      await prisma.meetInvite.update({ where: { id: inv.id }, data: { sentAt: new Date(), sendError: null } })
      sent++
    } catch (err) {
      console.error('[meet] invite email failed', inv.email, err instanceof Error ? err.message : err)
      await prisma.meetInvite.update({ where: { id: inv.id }, data: { sendError: 'The email could not be sent. Copy the link and send it yourself, or try again.' } })
      failed++
    }
  }
  return { sent, failed }
}

export async function createMeetRoom(input: z.input<typeof RoomInput>): Promise<ActionResult<{ code: string; sent: number; failed: number }>> {
  try {
    const user = await requireUser(['ADMIN'])
    if (!meetAvailable()) return { ok: false, error: meetSetupProblem() ?? 'Igani Meet isn’t set up yet: add the 8x8 keys in Vercel (see the setup box on this page).' }
    const v = RoomInput.parse(input)
    const me = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true, email: true } })
    const scheduledAt = v.when ? zonedInputToDate(v.when, me.timeZone) : null
    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) return { ok: false, error: 'That date and time isn’t valid.' }
    const invitees = (await people(v.userIds, v.emails)).filter((p) => p.email !== me.email?.toLowerCase())
    const room = await prisma.meetRoom.create({
      data: { code: newRoomCode(), title: v.title, hostId: user.id, scheduledAt, durationMin: v.durationMin, invites: { create: invitees.map((p) => ({ ...p, token: newInviteToken() })) } },
      include: { invites: { select: { id: true } } },
    })
    const r = v.send && room.invites.length ? await sendInvites(room.id, room.invites.map((i) => i.id)) : { sent: 0, failed: 0 }
    revalidatePath(PAGE)
    return { ok: true, data: { code: room.code, ...r } }
  } catch (err) {
    return toActionError(err)
  }
}

export async function addMeetInvites(input: { roomId: string; userIds?: string[]; emails?: string }): Promise<ActionResult<{ added: number; sent: number; failed: number }>> {
  try {
    await requireUser(['ADMIN'])
    const room = await prisma.meetRoom.findUniqueOrThrow({ where: { id: z.string().parse(input.roomId) }, select: { id: true, host: { select: { email: true } }, invites: { select: { email: true } } } })
    const have = new Set([...room.invites.map((i) => i.email), room.host?.email?.toLowerCase()])
    const fresh = (await people(input.userIds ?? [], input.emails ?? '')).filter((p) => !have.has(p.email))
    if (!fresh.length) return { ok: false, error: 'Everyone listed is already invited (or no valid email was given).' }
    const created = await prisma.$transaction(fresh.map((p) => prisma.meetInvite.create({ data: { ...p, roomId: room.id, token: newInviteToken() }, select: { id: true } })))
    const r = await sendInvites(room.id, created.map((c) => c.id))
    revalidatePath(PAGE)
    return { ok: true, data: { added: created.length, ...r } }
  } catch (err) {
    return toActionError(err)
  }
}

export async function resendMeetInvite(inviteId: string): Promise<ActionResult<{ sent: number; failed: number }>> {
  try {
    await requireUser(['ADMIN'])
    const inv = await prisma.meetInvite.findUniqueOrThrow({ where: { id: z.string().parse(inviteId) }, select: { id: true, roomId: true } })
    const r = await sendInvites(inv.roomId, [inv.id])
    revalidatePath(PAGE)
    return { ok: true, data: r }
  } catch (err) {
    return toActionError(err)
  }
}

export async function removeMeetInvite(inviteId: string): Promise<ActionResult> {
  try {
    await requireUser(['ADMIN'])
    await prisma.meetInvite.delete({ where: { id: z.string().parse(inviteId) } })
    revalidatePath(PAGE)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Ends a room: its links stop working. Deleting removes it from the list. */
export async function endMeetRoom(roomId: string, opts: { remove?: boolean } = {}): Promise<ActionResult> {
  try {
    await requireUser(['ADMIN'])
    const id = z.string().parse(roomId)
    if (opts.remove) await prisma.meetRoom.delete({ where: { id } })
    else await prisma.meetRoom.update({ where: { id }, data: { endedAt: new Date() } })
    revalidatePath(PAGE)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/**
 * Joining a room: with an invite token (guests and invited teammates), or signed in as an admin (hosts). Returns the
 * signed pass for this person only. Ended rooms and wrong tokens get a plain answer, never a hint about other rooms.
 */
export async function joinMeet(input: { code: string; token: string | null; name: string }): Promise<ActionResult<{ config: MeetConfig; name: string }>> {
  try {
    const code = z.string().min(6).max(60).parse(input.code)
    const name = z.string().trim().min(1, 'Type your name').max(60).parse(input.name)
    const room = await prisma.meetRoom.findUnique({ where: { code }, select: { id: true, code: true, endedAt: true, hostId: true } })
    if (!room) return { ok: false, error: 'This call link isn’t valid.' }
    if (room.endedAt) return { ok: false, error: 'This call has ended. Ask the host for a new link.' }
    const user = await currentUserOrNull()
    const invite = input.token ? await prisma.meetInvite.findUnique({ where: { token: z.string().max(100).parse(input.token) } }) : null
    if (invite && invite.roomId !== room.id) return { ok: false, error: 'This call link isn’t valid.' }
    const viaUser = !invite && user ? (user.role === 'ADMIN' ? true : Boolean(await prisma.meetInvite.findFirst({ where: { roomId: room.id, userId: user.id }, select: { id: true } }))) : false
    if (!invite && !viaUser) return { ok: false, error: input.token ? 'This invite link isn’t valid any more. Ask the host to send it again.' : 'You need an invite link to join this call.' }
    const me = user ? await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, name: true, email: true, image: true, role: true } }) : null
    const teammate = me && (!invite || invite.userId === me.id || invite.email === me.email?.toLowerCase()) ? me : null
    const display = teammate?.name ?? name
    const moderator = Boolean(teammate && (teammate.role === 'ADMIN' || teammate.id === room.hostId))
    const config = meetConfigFor(room.code, {
      id: teammate?.id ?? invite?.id ?? 'guest',
      name: display,
      email: teammate?.email ?? invite?.email ?? null,
      avatar: teammate ? (avatarPath(teammate) ? appUrl(avatarPath(teammate)!) : null) : null,
      moderator,
    })
    if (!config) return { ok: false, error: moderator && meetSetupProblem() ? `Igani Meet isn’t set up right: ${meetSetupProblem()}` : 'Igani Meet isn’t available right now. Please try again later.' }
    if (invite) await prisma.meetInvite.update({ where: { id: invite.id }, data: { joinedAt: invite.joinedAt ?? new Date(), ...(teammate ? {} : { name }) } })
    return { ok: true, data: { config, name: display } }
  } catch (err) {
    return toActionError(err)
  }
}
