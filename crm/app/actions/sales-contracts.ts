'use server'

import { requireUser } from '@/lib/auth'
import { createContractLink } from '@/lib/sales-contract'
import { validate, type ContractData } from '@/lib/sales-contract-core'
import { PNG_DATA_URL } from '@/lib/sales-contract-token'
import { prisma } from '@/lib/prisma'

export type LinkResultAction = { ok: true; url: string; expiresAt: string } | { ok: false; error: string }

/** Admin only. Signs with the chosen admin's saved signature and makes a short link; the agreement is kept for 12 hours or until signed. The signed PDF is emailed to the admin who made the link. */
export async function generateContractLink(data: ContractData, signerUserId: string): Promise<LinkResultAction> {
  const user = await requireUser(['ADMIN'])
  const err = validate(data)
  if (err) return { ok: false, error: err }
  const signer = await prisma.contractSigner.findUnique({ where: { userId: signerUserId } })
  if (!signer || !PNG_DATA_URL.test(signer.signature)) return { ok: false, error: 'The chosen signer has no signature yet. Click Edit signature, draw it and save.' }
  const link = await createContractLink(
    { name: data.name.trim(), email: data.email.trim(), effectiveDate: data.effectiveDate, figures: data.figures, terms: data.terms },
    { name: signer.title ? `${signer.name}, ${signer.title}` : signer.name, email: user.email, signature: signer.signature },
  )
  return { ok: true, url: link.url, expiresAt: link.expiresAt.toISOString() }
}
