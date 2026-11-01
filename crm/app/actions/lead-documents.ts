'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { requireUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { canSeeLead } from '@/lib/lead-access'
import { prisma } from '@/lib/prisma'
import { toActionError, type ActionResult } from './result'

/** Remove a client document. Admins can remove any; everyone else only what they uploaded themselves, on a lead they can see. */
export async function deleteLeadDocument(documentId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const id = z.string().cuid().parse(documentId)
    const d = await prisma.leadDocument.findUnique({ where: { id }, select: { leadId: true, title: true, uploadedById: true, lead: { select: { assignedToId: true } } } })
    if (!d || !canSeeLead(user, d.lead)) throw new BookingError('Document not found.', 'NOT_FOUND')
    if (user.role !== 'ADMIN' && d.uploadedById !== user.id) throw new BookingError('Only an admin or the person who uploaded it can remove a document.', 'FORBIDDEN')
    await prisma.$transaction(async (tx) => {
      await tx.leadDocument.delete({ where: { id } })
      await logActivity({ entityType: 'LEAD', entityId: d.leadId, action: 'document.removed', actorId: user.id, metadata: { documentId: id, title: d.title } }, tx)
    })
    revalidatePath(`/sales/leads/${d.leadId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}
