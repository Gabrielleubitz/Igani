'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { requireUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { prisma } from '@/lib/prisma'
import { MAX_SIGNATURE_CHARS, PNG_DATA_URL } from '@/lib/sales-contract-token'
import { toActionError, type ActionResult } from './result'

const Input = z.object({
  name: z.string().trim().min(2).max(120),
  title: z.string().trim().max(120),
  signature: z.string().max(MAX_SIGNATURE_CHARS).regex(PNG_DATA_URL, 'Draw the signature first.'),
})

/** Admin only: save (or replace) one admin's signature for commission agreements. Every change is written to the activity log with who made it. */
export async function saveContractSigner(userId: string, input: z.input<typeof Input>): Promise<ActionResult> {
  try {
    const actor = await requireUser(['ADMIN'])
    const uid = z.string().cuid().parse(userId)
    const v = Input.parse(input)
    const target = await prisma.user.findUnique({ where: { id: uid }, select: { role: true } })
    if (target?.role !== 'ADMIN') throw new BookingError('Only admins can sign contracts for the company.', 'NOT_FOUND')
    await prisma.$transaction(async (tx) => {
      await tx.contractSigner.upsert({ where: { userId: uid }, create: { userId: uid, ...v }, update: v })
      await logActivity({ entityType: 'USER', entityId: uid, action: 'contract_signer.updated', actorId: actor.id, metadata: { by: actor.id, own: actor.id === uid, name: v.name, title: v.title } }, tx)
    })
    revalidatePath('/admin/sales-contracts')
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}
