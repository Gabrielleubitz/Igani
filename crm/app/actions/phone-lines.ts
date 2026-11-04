'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { requireUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { normalizePhone } from '@/lib/phone-numbers'
import { prisma } from '@/lib/prisma'
import { toActionError, type ActionResult } from './result'

const Assign = z.object({ userId: z.string().cuid(), number: z.string().trim().min(3).max(40), twilioSid: z.string().regex(/^PN[0-9a-f]{32}$/i).nullish() })

/** Admin: give a teammate (admin or salesperson) a Twilio number. One number per person, one person per number. */
export async function assignPhoneLine(input: z.input<typeof Assign>): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const data = Assign.parse(input)
    const number = normalizePhone(data.number, 'US')
    if (!number) throw new BookingError('Enter the number in full international form, e.g. +972 50 123 4567.', 'INVALID_STATE')
    const user = await prisma.user.findUnique({ where: { id: data.userId }, select: { role: true, email: true } })
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SALES')) throw new BookingError('Only admins and salespeople can have a phone line.', 'INVALID_STATE')
    const taken = await prisma.phoneLine.findUnique({ where: { number } })
    if (taken && taken.userId !== data.userId) throw new BookingError('That number already belongs to another teammate.', 'SLOT_TAKEN')
    await prisma.phoneLine.upsert({ where: { userId: data.userId }, create: { userId: data.userId, number, twilioSid: data.twilioSid ?? null }, update: { number, twilioSid: data.twilioSid ?? null, active: true } })
    await logActivity({ entityType: 'USER', entityId: data.userId, actorId: admin.id, action: 'phone.line_assigned', metadata: { number } })
    revalidatePath('/admin/phone')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Admin: take a teammate's number away (their past calls stay). */
export async function removePhoneLine(userId: string): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const id = z.string().cuid().parse(userId)
    const line = await prisma.phoneLine.findUnique({ where: { userId: id } })
    if (!line) return { ok: true, data: undefined }
    await prisma.phoneLine.delete({ where: { userId: id } })
    await logActivity({ entityType: 'USER', entityId: id, actorId: admin.id, action: 'phone.line_removed', metadata: { number: line.number } })
    revalidatePath('/admin/phone')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}
