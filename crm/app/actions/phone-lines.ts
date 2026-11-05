'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { requireUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { normalizePhone } from '@/lib/phone-numbers'
import { prisma } from '@/lib/prisma'
import { listTwilioNumbers, restoreNumberRouting, routeNumberToCrm, routedToCrm, smsUrl, twilioConfig, type NumberRouting } from '@/lib/twilio'
import { toActionError, type ActionResult } from './result'

const Assign = z.object({ userId: z.string().cuid(), number: z.string().trim().min(3).max(40), twilioSid: z.string().regex(/^PN[0-9a-f]{32}$/i).nullish() })

/** What happened to the number's incoming calls when it was assigned. */
export type IncomingSetup = 'routed' | 'already' | 'not-found' | 'failed' | 'no-twilio'

/**
 * Point a number's incoming calls at the CRM, saving where they went before (only the first time, so routing twice never
 * overwrites the original with our own URL).
 */
async function routeToCrm(sid: string, actorId: string): Promise<void> {
  const c = twilioConfig()
  if (!c) throw new BookingError('Twilio is not connected.', 'INVALID_STATE')
  const before = await routeNumberToCrm(c, sid)
  const key = `voice.routing:${sid}`
  const saved = (await prisma.siteSetting.findUnique({ where: { key } }))?.value as NumberRouting | undefined
  // keep the original routing; a routing saved before texting existed gains the original text settings now
  if (!saved) await prisma.siteSetting.create({ data: { key, value: before } })
  else if (saved.smsUrl === undefined && before.smsUrl !== undefined && before.smsUrl !== smsUrl()) await prisma.siteSetting.update({ where: { key }, data: { value: { ...saved, smsUrl: before.smsUrl, smsMethod: before.smsMethod, smsAppSid: before.smsAppSid } } })
  await logActivity({ entityType: 'SETTING', entityId: `voice.routing:${sid}`, actorId, action: 'phone.incoming_routed', metadata: { before } })
}

/** A newly assigned number rings in the CRM straight away. Never fails the assignment: reports what happened instead. */
async function setUpIncoming(number: string, knownSid: string | null, actorId: string): Promise<{ setup: IncomingSetup; sid: string | null }> {
  const c = twilioConfig()
  if (!c) return { setup: 'no-twilio', sid: knownSid }
  try {
    const found = (await listTwilioNumbers(c)).find((n) => (knownSid ? n.sid === knownSid : n.number === number))
    if (!found) return { setup: 'not-found', sid: knownSid }
    if (routedToCrm(found)) return { setup: 'already', sid: found.sid }
    await routeToCrm(found.sid, actorId)
    return { setup: 'routed', sid: found.sid }
  } catch (err) {
    console.error('[phone] could not route incoming calls', err)
    return { setup: 'failed', sid: knownSid }
  }
}

/**
 * Admin: give a teammate (admin or salesperson) a Twilio number. One number per person, one person per number. Its
 * incoming calls are pointed at the CRM at the same time (the earlier routing is kept for undo).
 */
export async function assignPhoneLine(input: z.input<typeof Assign>): Promise<ActionResult<{ incoming: IncomingSetup }>> {
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
    const incoming = await setUpIncoming(number, data.twilioSid ?? null, admin.id)
    if (incoming.sid && !data.twilioSid) await prisma.phoneLine.update({ where: { userId: data.userId }, data: { twilioSid: incoming.sid } })
    revalidatePath('/admin/phone')
    return { ok: true, data: { incoming: incoming.setup } }
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

const NumberSid = z.string().regex(/^PN[0-9a-f]{32}$/i)

/** Admin: make a Twilio number's incoming calls ring in the CRM. Its previous routing is saved for undo. */
export async function routeIncomingToCrm(numberSid: string): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    await routeToCrm(NumberSid.parse(numberSid), admin.id)
    revalidatePath('/admin/phone')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Admin: undo — put the number's incoming calls back where they went before. */
export async function restoreIncomingRouting(numberSid: string): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const sid = NumberSid.parse(numberSid)
    const c = twilioConfig()
    if (!c) throw new BookingError('Twilio is not connected.', 'INVALID_STATE')
    const saved = await prisma.siteSetting.findUnique({ where: { key: `voice.routing:${sid}` } })
    if (!saved) throw new BookingError('There is no earlier routing saved for this number.', 'INVALID_STATE')
    await restoreNumberRouting(c, sid, saved.value as NumberRouting)
    await prisma.siteSetting.delete({ where: { key: `voice.routing:${sid}` } })
    await logActivity({ entityType: 'SETTING', entityId: `voice.routing:${sid}`, actorId: admin.id, action: 'phone.incoming_restored', metadata: { restored: saved.value } })
    revalidatePath('/admin/phone')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}
