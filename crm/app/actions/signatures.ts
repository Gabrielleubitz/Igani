'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MAX_SIGNATURE_CHARS, PNG_DATA_URL } from '@/lib/sales-contract-token'
import { toActionError, type ActionResult } from './result'

const Input = z.object({
  id: z.string().min(3).max(40).optional(),
  label: z.string().trim().max(80).optional(),
  name: z.string().trim().min(2, 'Write the signer’s name.').max(120),
  title: z.string().trim().max(120).default(''),
  email: z.union([z.literal(''), z.string().trim().email('That email doesn’t look right.').max(254)]).default(''),
  phone: z.string().trim().max(40).default(''),
  image: z.string().max(MAX_SIGNATURE_CHARS, 'That image is too big. Use a smaller PNG.').regex(PNG_DATA_URL, 'Draw the signature (or upload a PNG) first.'),
  isDefault: z.boolean().optional(),
})

const refresh = (): void => {
  revalidatePath('/admin/settings')
  revalidatePath('/admin/sales-contracts')
}

/** Admin only: add or edit a saved signature. The first one becomes the default. */
export async function saveSignature(input: z.input<typeof Input>): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser(['ADMIN'])
    const v = Input.parse(input)
    const label = v.label || (v.title ? `${v.name} · ${v.title}` : v.name)
    const data = { label, name: v.name, title: v.title, email: v.email, phone: v.phone, image: v.image }
    const row = await prisma.$transaction(async (tx) => {
      const first = !(await tx.signature.count({ where: { archivedAt: null } }))
      const makeDefault = first || v.isDefault === true
      if (makeDefault) await tx.signature.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
      const saved = v.id
        ? await tx.signature.update({ where: { id: v.id }, data: { ...data, ...(makeDefault ? { isDefault: true } : {}) } })
        : await tx.signature.create({ data: { ...data, isDefault: makeDefault, createdById: user.id } })
      await logActivity({ entityType: 'SETTING', entityId: 'signatures', action: v.id ? 'signature.updated' : 'signature.added', actorId: user.id, metadata: { signatureId: saved.id, label } }, tx)
      return saved
    })
    refresh()
    return { ok: true, data: { id: row.id } }
  } catch (err) {
    return toActionError(err)
  }
}

/** Admin only: sign with this one unless another is picked. */
export async function setDefaultSignature(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser(['ADMIN'])
    const sid = z.string().min(3).max(40).parse(id)
    await prisma.$transaction(async (tx) => {
      const row = await tx.signature.findFirst({ where: { id: sid, archivedAt: null } })
      if (!row) throw new Error('That signature is gone.')
      await tx.signature.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
      await tx.signature.update({ where: { id: sid }, data: { isDefault: true } })
      await logActivity({ entityType: 'SETTING', entityId: 'signatures', action: 'signature.default', actorId: user.id, metadata: { signatureId: sid, label: row.label } }, tx)
    })
    refresh()
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Admin only: remove a signature. Contracts already signed with it keep their copy. */
export async function deleteSignature(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser(['ADMIN'])
    const sid = z.string().min(3).max(40).parse(id)
    await prisma.$transaction(async (tx) => {
      const row = await tx.signature.update({ where: { id: sid }, data: { archivedAt: new Date(), isDefault: false } })
      // keep a default while any signature is left
      if (row && !(await tx.signature.count({ where: { isDefault: true, archivedAt: null } }))) {
        const next = await tx.signature.findFirst({ where: { archivedAt: null }, orderBy: { createdAt: 'asc' } })
        if (next) await tx.signature.update({ where: { id: next.id }, data: { isDefault: true } })
      }
      await logActivity({ entityType: 'SETTING', entityId: 'signatures', action: 'signature.removed', actorId: user.id, metadata: { signatureId: sid, label: row.label } }, tx)
    })
    refresh()
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}
