'use server'

import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { requireUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { parseContractDoc, type ContractDoc } from '@/lib/contract'
import { draftContract } from '@/lib/contract-ai'
import { contractFacts } from '@/lib/contract-data'
import { prisma } from '@/lib/prisma'
import { signerSnapshot } from '@/lib/signatures'
import { toActionError, type ActionResult } from './result'

const Lang = z.enum(['he', 'en'])
const refresh = (id: string): void => {
  revalidatePath(`/admin/offers/${id}`)
  revalidatePath(`/admin/offers/${id}/contract`)
}

async function editable(id: string): Promise<{ id: string; leadId: string }> {
  const o = await prisma.offer.findUnique({ where: { id }, select: { id: true, leadId: true, signedAt: true, contractApprovedAt: true } })
  if (!o) throw new BookingError('Offer not found.', 'NOT_FOUND')
  if (o.signedAt) throw new BookingError('This offer is signed. Its contract can no longer change.', 'INVALID_STATE')
  if (o.contractApprovedAt) throw new BookingError('The contract is approved. Reopen it to edit.', 'INVALID_STATE')
  return o
}

/** AI first draft from Igani's standard terms + this offer. Replaces the current draft. */
export async function draftContractWithAI(input: { id: string; lang: 'he' | 'en' }): Promise<ActionResult<ContractDoc>> {
  try {
    const user = await requireUser(['ADMIN'])
    const id = z.string().cuid().parse(input.id)
    const lang = Lang.parse(input.lang)
    await editable(id)
    const offer = await prisma.offer.findUniqueOrThrow({ where: { id }, include: { lead: { select: { firstName: true, lastName: true, email: true, phone: true, company: true } } } })
    let doc: ContractDoc
    try {
      doc = await draftContract(await contractFacts(offer, lang), lang)
    } catch (err) {
      throw new BookingError(err instanceof Error ? err.message : 'The AI draft failed.', 'INVALID_STATE')
    }
    await prisma.offer.update({ where: { id }, data: { contractDoc: doc as unknown as Prisma.InputJsonValue, contractLang: lang } })
    await logActivity({ entityType: 'OFFER', entityId: id, action: 'contract.drafted', actorId: user.id, metadata: { lang, sections: doc.sections.length } })
    refresh(id)
    return { ok: true, data: doc }
  } catch (err) {
    return toActionError(err)
  }
}

export async function saveContract(input: { id: string; lang: 'he' | 'en'; doc: unknown }): Promise<ActionResult> {
  try {
    const user = await requireUser(['ADMIN'])
    const id = z.string().cuid().parse(input.id)
    const lang = Lang.parse(input.lang)
    await editable(id)
    const doc = parseContractDoc(input.doc)
    if (!doc) throw new BookingError('The contract needs a title and at least one section.', 'INVALID_STATE')
    await prisma.offer.update({ where: { id }, data: { contractDoc: doc as unknown as Prisma.InputJsonValue, contractLang: lang } })
    await logActivity({ entityType: 'OFFER', entityId: id, action: 'contract.edited', actorId: user.id, metadata: { lang, sections: doc.sections.length } })
    refresh(id)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Locks the text and signs it for Igani with the chosen saved signature (the default if none is picked). The client can sign from then on. */
export async function approveContract(id: string, signatureId?: string | null): Promise<ActionResult> {
  try {
    const user = await requireUser(['ADMIN'])
    const offerId = z.string().cuid().parse(id)
    const o = await editable(offerId)
    const row = await prisma.offer.findUniqueOrThrow({ where: { id: offerId }, select: { contractDoc: true } })
    if (!parseContractDoc(row.contractDoc)) throw new BookingError('Draft the contract first.', 'INVALID_STATE')
    const signer = await signerSnapshot(signatureId ? z.string().min(3).max(40).parse(signatureId) : null)
    if (!signer) throw new BookingError('Add a signature in Settings → Signatures first.', 'INVALID_STATE')
    await prisma.$transaction(async (tx) => {
      // a copy of the signature: editing or deleting it in Settings later doesn't change this contract
      await tx.offer.update({ where: { id: offerId }, data: { contractApprovedAt: new Date(), contractApprovedById: user.id, contractSigner: signer as unknown as Prisma.InputJsonValue } })
      await logActivity({ entityType: 'LEAD', entityId: o.leadId, action: 'contract.approved', actorId: user.id, metadata: { offerId, signedAs: signer.title ? `${signer.name}, ${signer.title}` : signer.name } }, tx)
    })
    refresh(offerId)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Back to editing (only while nobody has signed). */
export async function reopenContract(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser(['ADMIN'])
    const offerId = z.string().cuid().parse(id)
    const o = await prisma.offer.findUnique({ where: { id: offerId }, select: { signedAt: true } })
    if (!o) throw new BookingError('Offer not found.', 'NOT_FOUND')
    if (o.signedAt) throw new BookingError('This offer is signed. Its contract can no longer change.', 'INVALID_STATE')
    await prisma.offer.update({ where: { id: offerId }, data: { contractApprovedAt: null, contractApprovedById: null, contractSigner: Prisma.DbNull } })
    await logActivity({ entityType: 'OFFER', entityId: offerId, action: 'contract.reopened', actorId: user.id })
    refresh(offerId)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}
