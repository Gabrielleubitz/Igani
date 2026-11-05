'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { requireUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { prisma } from '@/lib/prisma'
import { toActionError, type ActionResult } from './result'

const schema = z.object({ callId: z.string().cuid(), userId: z.string().cuid() })

/** Admin only: let this salesman open the call (recording, transcript, review). It is not counted in his numbers. */
export async function shareCall(input: z.input<typeof schema>): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const { callId, userId } = schema.parse(input)
    const [call, target] = await Promise.all([prisma.call.findUnique({ where: { id: callId }, select: { id: true, userId: true } }), prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } })])
    if (!call) throw new BookingError('Call not found.', 'NOT_FOUND')
    if (!target || (target.role !== 'SALES' && target.role !== 'ADMIN')) throw new BookingError('Pick a salesman.', 'INVALID_STATE')
    if (call.userId === userId) throw new BookingError('That is already his own call.', 'INVALID_STATE')
    await prisma.callShare.upsert({ where: { callId_userId: { callId, userId } }, create: { callId, userId, sharedById: admin.id }, update: {} })
    await logActivity({ entityType: 'USER', entityId: userId, actorId: admin.id, action: 'call.share', metadata: { callId } })
    revalidatePath(`/sales/calls/${callId}`)
    revalidatePath('/sales/calls')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

export async function unshareCall(input: z.input<typeof schema>): Promise<ActionResult> {
  try {
    const admin = await requireUser(['ADMIN'])
    const { callId, userId } = schema.parse(input)
    await prisma.callShare.deleteMany({ where: { callId, userId } })
    await logActivity({ entityType: 'USER', entityId: userId, actorId: admin.id, action: 'call.unshare', metadata: { callId } })
    revalidatePath(`/sales/calls/${callId}`)
    revalidatePath('/sales/calls')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}
