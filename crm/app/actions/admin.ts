'use server'

import { randomBytes } from 'node:crypto'
import { Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { normalizeEmail, requireUser } from '@/lib/auth'
import { sendTeamInviteEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { reassignUserWork } from '@/lib/leads'
import { SETTING_SCHEMAS, isSettingKey } from '@/lib/settings'
import { parseHHmm } from '@/lib/slots'
import { toActionError, type ActionResult } from './result'

const emailSchema = z.string().trim().email().max(254).transform(normalizeEmail)

/** Add or update a whitelisted email. Role is mirrored to the User row immediately. */
export async function upsertAllowedUser(input: { email: string; role: Role; active: boolean }): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const data = z.object({ email: emailSchema, role: z.nativeEnum(Role), active: z.boolean() }).parse(input)
    if (data.email === admin.email && (!data.active || data.role !== 'ADMIN')) {
      throw new z.ZodError([{ code: 'custom', path: ['email'], message: 'You cannot demote or deactivate yourself' }])
    }
    const isNew = !(await prisma.allowedUser.findUnique({ where: { email: data.email }, select: { id: true } }))
    const row = await prisma.$transaction(async (tx) => {
      const allowed = await tx.allowedUser.upsert({ where: { email: data.email }, create: data, update: { role: data.role, active: data.active } })
      const users = await tx.user.findMany({ where: { email: data.email }, select: { id: true } })
      await tx.user.updateMany({ where: { email: data.email }, data: { role: data.active ? data.role : null } })
      // Deactivated (or moved off SALES/ADMIN) users must not keep owning leads.
      if (users[0] && (!data.active || data.role === 'MARKETING')) await reassignUserWork(users[0].id, null, admin.id, tx)
      await logActivity({ entityType: 'ALLOWED_USER', entityId: allowed.id, action: 'whitelist.upserted', actorId: admin.id, metadata: data }, tx)
      return allowed
    })
    revalidatePath('/admin/users')
    if (isNew && data.active) await issueInvite(data.email, data.role, admin.name ?? admin.email).catch((err: unknown) => console.error('[invite] email failed', data.email, err))
    return row ? { ok: true, data: undefined } : { ok: false, error: 'Not saved' }
  } catch (err) {
    return toActionError(err)
  }
}

/** Mint a fresh single-use onboarding token and email the branded invite. */
async function issueInvite(email: string, role: Role, inviterName: string): Promise<void> {
  const token = randomBytes(24).toString('base64url')
  await prisma.allowedUser.update({ where: { email }, data: { inviteToken: token, invitedAt: new Date(), inviteAcceptedAt: null } })
  await sendTeamInviteEmail({ to: email, role, inviterName, token })
}

/** Re-send the onboarding invite to an active whitelisted email. */
export async function resendInvite(email: string): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const e = emailSchema.parse(email)
    const row = await prisma.allowedUser.findUnique({ where: { email: e } })
    if (!row || !row.active) throw new z.ZodError([{ code: 'custom', path: ['email'], message: 'Not an active team member' }])
    await issueInvite(e, row.role, admin.name ?? admin.email)
    revalidatePath('/admin/users')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

const hhmm = z.string().refine((v) => {
  try {
    parseHHmm(v)
    return true
  } catch {
    return false
  }
}, 'Expected HH:mm')

const availabilitySchema = z.object({
  timeZone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz })
      return true
    } catch {
      return false
    }
  }, 'Unknown time zone'),
  rules: z
    .array(z.object({ dayOfWeek: z.number().int().min(0).max(6), startTime: hhmm, endTime: hhmm }))
    .max(50)
    .refine((rules) => rules.every((r) => parseHHmm(r.endTime) > parseHHmm(r.startTime)), 'End must be after start'),
})

/** Replace the signed-in user's weekly working hours. */
export async function saveMyAvailability(input: z.input<typeof availabilitySchema>): Promise<ActionResult> {
  try {
    const user = await requireUser(['ADMIN', 'SALES'])
    const data = availabilitySchema.parse(input)
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { timeZone: data.timeZone } })
      await tx.availability.deleteMany({ where: { hostId: user.id } })
      if (data.rules.length) await tx.availability.createMany({ data: data.rules.map((r) => ({ ...r, hostId: user.id })) })
      await logActivity({ entityType: 'AVAILABILITY', entityId: user.id, action: 'availability.updated', actorId: user.id, metadata: data }, tx)
    })
    revalidatePath('/sales/availability')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

const bookingPageSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes').max(60),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  durationMinutes: z.number().int().min(15).max(240),
  requiresApproval: z.boolean(),
  active: z.boolean(),
  hostId: z.string().cuid(),
})

export async function upsertBookingPage(input: z.input<typeof bookingPageSchema>): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const data = bookingPageSchema.parse(input)
    const host = await prisma.user.findUnique({ where: { id: data.hostId }, select: { role: true } })
    if (!host || (host.role !== 'ADMIN' && host.role !== 'SALES')) {
      throw new z.ZodError([{ code: 'custom', path: ['hostId'], message: 'Host must be an ADMIN or SALES user' }])
    }
    await prisma.$transaction(async (tx) => {
      const page = await tx.bookingPage.upsert({ where: { slug: data.slug }, create: data, update: data })
      await logActivity({ entityType: 'BOOKING_PAGE', entityId: page.id, action: 'booking_page.upserted', actorId: admin.id, metadata: data }, tx)
    })
    revalidatePath('/admin/booking-pages')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Remove a whitelist entry entirely. Their leads become unassigned; their sign-in is revoked. */
export async function removeAllowedUser(email: string): Promise<ActionResult<{ unassignedLeads: number }>> {
  try {
    const admin = await requireUser(['ADMIN'])
    const e = emailSchema.parse(email)
    if (e === admin.email) throw new z.ZodError([{ code: 'custom', path: ['email'], message: 'You cannot remove yourself' }])
    const unassignedLeads = await prisma.$transaction(async (tx) => {
      const allowed = await tx.allowedUser.findUnique({ where: { email: e } })
      if (!allowed) throw new z.ZodError([{ code: 'custom', path: ['email'], message: 'Not on the whitelist' }])
      const user = await tx.user.findUnique({ where: { email: e }, select: { id: true } })
      let n = 0
      if (user) {
        n = await reassignUserWork(user.id, null, admin.id, tx)
        await tx.session.deleteMany({ where: { userId: user.id } })
        await tx.user.update({ where: { id: user.id }, data: { role: null } })
        await tx.bookingPage.updateMany({ where: { hostId: user.id }, data: { active: false } })
      }
      await tx.allowedUser.delete({ where: { email: e } })
      await logActivity({ entityType: 'ALLOWED_USER', entityId: allowed.id, action: 'whitelist.removed', actorId: admin.id, metadata: { email: e, unassignedLeads: n } }, tx)
      return n
    })
    revalidatePath('/admin/users')
    return { ok: true, data: { unassignedLeads } }
  } catch (err) {
    return toActionError(err)
  }
}

/** Delete a public booking page. Existing bookings are kept (link cleared). */
export async function deleteBookingPage(id: string): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const pageId = z.string().cuid().parse(id)
    await prisma.$transaction(async (tx) => {
      const page = await tx.bookingPage.delete({ where: { id: pageId } })
      await logActivity({ entityType: 'BOOKING_PAGE', entityId: pageId, action: 'booking_page.deleted', actorId: admin.id, metadata: { slug: page.slug } }, tx)
    })
    revalidatePath('/admin/booking-pages')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Save one or more site settings (validated against SETTING_SCHEMAS). */
export async function saveSettings(values: Record<string, unknown>): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const entries = Object.entries(values)
    for (const [key] of entries) {
      if (!isSettingKey(key)) throw new z.ZodError([{ code: 'custom', path: [key], message: 'Unknown setting' }])
    }
    const parsed = entries.map(([key, v]) => [key, SETTING_SCHEMAS[key as keyof typeof SETTING_SCHEMAS].parse(v)] as const)
    await prisma.$transaction(async (tx) => {
      for (const [key, value] of parsed) {
        await tx.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } })
      }
      await logActivity({ entityType: 'SETTING', entityId: 'site', action: 'settings.updated', actorId: admin.id, metadata: Object.fromEntries(parsed) }, tx)
    })
    revalidatePath('/admin/settings')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}
