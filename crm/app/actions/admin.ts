'use server'

import { Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { normalizeEmail, requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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
    const row = await prisma.$transaction(async (tx) => {
      const allowed = await tx.allowedUser.upsert({ where: { email: data.email }, create: data, update: { role: data.role, active: data.active } })
      await tx.user.updateMany({ where: { email: data.email }, data: { role: data.active ? data.role : null } })
      await logActivity({ entityType: 'ALLOWED_USER', entityId: allowed.id, action: 'whitelist.upserted', actorId: admin.id, metadata: data }, tx)
      return allowed
    })
    revalidatePath('/admin/users')
    return row ? { ok: true, data: undefined } : { ok: false, error: 'Not saved' }
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
