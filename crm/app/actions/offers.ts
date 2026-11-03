'use server'

import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { requireUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { isOwnCloudinaryUrl } from '@/lib/cloudinary'
import { MODULE_GROUPS, parseModules, slugProblem } from '@/lib/offer-modules'
import { MAX_TRANSCRIPT_CHARS, modulesFromTranscript, type TranscriptModules } from '@/lib/offer-transcript-ai'
import { prisma } from '@/lib/prisma'
import { toActionError, type ActionResult } from './result'

const refresh = (id: string, leadId?: string): void => {
  revalidatePath('/admin/offers')
  revalidatePath(`/admin/offers/${id}`)
  if (leadId) revalidatePath(`/sales/leads/${leadId}`)
}

const CreateInput = z.object({
  leadId: z.string().cuid(),
  slug: z.string().trim().toLowerCase(),
  title: z.string().trim().min(2).max(160),
})

/** A new draft offer for an existing lead. Admins only. */
export async function createOffer(input: z.input<typeof CreateInput>): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser(['ADMIN'])
    const data = CreateInput.parse(input)
    const problem = slugProblem(data.slug)
    if (problem) throw new BookingError(problem, 'INVALID_STATE')
    const lead = await prisma.lead.findUnique({ where: { id: data.leadId }, select: { id: true } })
    if (!lead) throw new BookingError('That lead no longer exists.', 'NOT_FOUND')
    if (await prisma.offer.findUnique({ where: { slug: data.slug }, select: { id: true } })) throw new BookingError(`"${data.slug}" is already used by another offer. Pick another name.`, 'INVALID_STATE')
    const offer = await prisma.$transaction(async (tx) => {
      const o = await tx.offer.create({ data: { leadId: data.leadId, slug: data.slug, title: data.title, createdById: user.id }, select: { id: true } })
      await logActivity({ entityType: 'LEAD', entityId: data.leadId, action: 'offer.created', actorId: user.id, metadata: { offerId: o.id, slug: data.slug, title: data.title } }, tx)
      return o
    })
    refresh(offer.id, data.leadId)
    return { ok: true, data: offer }
  } catch (err) {
    return toActionError(err)
  }
}

const ModuleInput = z.object({
  id: z.string().trim().min(1).max(60).regex(/^[a-z0-9-]+$/i, 'Module keys use letters, numbers and dashes'),
  group: z.enum(MODULE_GROUPS),
  name: z.string().trim().min(1).max(120),
  price: z.number().int().min(0).max(100_000_000),
  required: z.boolean(),
  included: z.boolean(),
  summary: z.string().trim().max(500).optional(),
})
const UpdateInput = z.object({
  id: z.string().cuid(),
  title: z.string().trim().min(2).max(160),
  slug: z.string().trim().toLowerCase(),
  currency: z.enum(['ILS', 'USD', 'EUR', 'GBP']),
  monthlyPrice: z.number().int().min(0).max(10_000_000).nullable(),
  timelineMonths: z.number().int().min(1).max(60).nullable(),
  modules: z.array(ModuleInput).max(60),
})

/** The numbers: title, slug, currency, monthly fee, timeline and the priced modules. */
export async function updateOffer(input: z.input<typeof UpdateInput>): Promise<ActionResult> {
  try {
    const user = await requireUser(['ADMIN'])
    const data = UpdateInput.parse(input)
    const offer = await prisma.offer.findUnique({ where: { id: data.id }, select: { slug: true, status: true, leadId: true } })
    if (!offer) throw new BookingError('Offer not found.', 'NOT_FOUND')
    if (offer.status === 'SIGNED') throw new BookingError('This offer is signed. Its numbers can no longer change.', 'INVALID_STATE')
    if (data.slug !== offer.slug) {
      if (offer.status !== 'DRAFT') throw new BookingError('The web address can only change while the offer is a draft (the client may already have the link).', 'INVALID_STATE')
      const problem = slugProblem(data.slug)
      if (problem) throw new BookingError(problem, 'INVALID_STATE')
    }
    const ids = data.modules.map((m) => m.id)
    if (new Set(ids).size !== ids.length) throw new BookingError('Two modules have the same key. Each module needs its own key.', 'INVALID_STATE')
    const modules = parseModules(data.modules)
    await prisma.$transaction(async (tx) => {
      await tx.offer.update({
        where: { id: data.id },
        data: { title: data.title, slug: data.slug, currency: data.currency, monthlyPrice: data.monthlyPrice, timelineMonths: data.timelineMonths, modules: modules as unknown as Prisma.InputJsonValue },
      })
      await logActivity({ entityType: 'OFFER', entityId: data.id, action: 'offer.updated', actorId: user.id, metadata: { slug: data.slug, modules: modules.length } }, tx)
    })
    refresh(data.id, offer.leadId)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

const StatusInput = z.object({ id: z.string().cuid(), status: z.enum(['DRAFT', 'LIVE', 'ARCHIVED']) })

/** Publish (LIVE), take back to draft, or archive. A signed offer stays signed. */
export async function setOfferStatus(input: z.input<typeof StatusInput>): Promise<ActionResult> {
  try {
    const user = await requireUser(['ADMIN'])
    const data = StatusInput.parse(input)
    const offer = await prisma.offer.findUnique({ where: { id: data.id }, select: { status: true, leadId: true, publishedAt: true, signedAt: true } })
    if (!offer) throw new BookingError('Offer not found.', 'NOT_FOUND')
    // A signed offer (even one archived later) can never be reopened for signing
    if (offer.signedAt && data.status !== 'ARCHIVED') throw new BookingError('This offer was signed and stays that way.', 'INVALID_STATE')
    await prisma.$transaction(async (tx) => {
      await tx.offer.update({ where: { id: data.id }, data: { status: data.status, ...(data.status === 'LIVE' && !offer.publishedAt ? { publishedAt: new Date() } : {}) } })
      await logActivity({ entityType: 'LEAD', entityId: offer.leadId, action: `offer.${data.status.toLowerCase()}`, actorId: user.id, metadata: { offerId: data.id, from: offer.status, to: data.status } }, tx)
    })
    refresh(data.id, offer.leadId)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

const ContractInput = z.object({ id: z.string().cuid(), url: z.string().url(), publicId: z.string().min(1).max(300), fileName: z.string().trim().min(1).max(200) })

/** Saves the contract after the browser uploaded it straight to Cloudinary (see /api/admin/offers/[id]/contract-upload). */
export async function saveOfferContract(input: z.input<typeof ContractInput>): Promise<ActionResult> {
  try {
    const user = await requireUser(['ADMIN'])
    const data = ContractInput.parse(input)
    if (!isOwnCloudinaryUrl(data.url)) throw new BookingError('That file is not from our Cloudinary account.', 'INVALID_STATE')
    const offer = await prisma.offer.findUnique({ where: { id: data.id }, select: { status: true, leadId: true } })
    if (!offer) throw new BookingError('Offer not found.', 'NOT_FOUND')
    if (offer.status === 'SIGNED') throw new BookingError('This offer is signed. The contract can no longer change.', 'INVALID_STATE')
    await prisma.$transaction(async (tx) => {
      await tx.offer.update({ where: { id: data.id }, data: { contractUrl: data.url, contractPublicId: data.publicId, contractFileName: data.fileName } })
      await logActivity({ entityType: 'OFFER', entityId: data.id, action: 'offer.contract_uploaded', actorId: user.id, metadata: { fileName: data.fileName } }, tx)
    })
    refresh(data.id, offer.leadId)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Drafts can be deleted outright; anything a client may have seen is archived instead. */
export async function deleteDraftOffer(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser(['ADMIN'])
    const offerId = z.string().cuid().parse(id)
    const offer = await prisma.offer.findUnique({ where: { id: offerId }, select: { status: true, leadId: true, slug: true } })
    if (!offer) throw new BookingError('Offer not found.', 'NOT_FOUND')
    if (offer.status !== 'DRAFT') throw new BookingError('Only drafts can be deleted. Archive it instead.', 'INVALID_STATE')
    await prisma.$transaction(async (tx) => {
      await tx.offer.delete({ where: { id: offerId } })
      await logActivity({ entityType: 'LEAD', entityId: offer.leadId, action: 'offer.deleted', actorId: user.id, metadata: { offerId, slug: offer.slug } }, tx)
    })
    refresh(offerId, offer.leadId)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

const TranscriptInput = z.object({ id: z.string().cuid(), transcript: z.string().min(1).max(MAX_TRANSCRIPT_CHARS * 2) })

/** Reads a call transcript with OpenAI and suggests modules. Nothing is saved: the admin picks, prices and saves. */
export async function suggestModulesFromTranscript(input: z.input<typeof TranscriptInput>): Promise<ActionResult<TranscriptModules>> {
  try {
    const user = await requireUser(['ADMIN'])
    const data = TranscriptInput.parse(input)
    const offer = await prisma.offer.findUnique({ where: { id: data.id }, select: { status: true, modules: true } })
    if (!offer) throw new BookingError('Offer not found.', 'NOT_FOUND')
    if (offer.status === 'SIGNED') throw new BookingError('This offer is signed. Its modules can no longer change.', 'INVALID_STATE')
    let result: TranscriptModules
    try {
      result = await modulesFromTranscript(data.transcript, parseModules(offer.modules))
    } catch (err) {
      throw new BookingError(err instanceof Error ? err.message : 'The AI step failed.', 'INVALID_STATE')
    }
    await logActivity({ entityType: 'OFFER', entityId: data.id, action: 'offer.modules_suggested', actorId: user.id, metadata: { chars: data.transcript.length, suggested: result.modules.length } })
    return { ok: true, data: result }
  } catch (err) {
    return toActionError(err)
  }
}
