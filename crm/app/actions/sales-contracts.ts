'use server'

import { requireUser } from '@/lib/auth'
import { createContractLink } from '@/lib/sales-contract'
import { validate, type ContractData } from '@/lib/sales-contract-core'
import { MAX_SIGNATURE_CHARS, PNG_DATA_URL } from '@/lib/sales-contract-token'

export type LinkResultAction = { ok: true; url: string; expiresAt: string } | { ok: false; error: string }

/** Admin only. Builds the signed link; nothing is saved (the contract lives inside the link). */
export async function generateContractLink(data: ContractData, signature: string): Promise<LinkResultAction> {
  const user = await requireUser(['ADMIN'])
  const err = validate(data)
  if (err) return { ok: false, error: err }
  if (!PNG_DATA_URL.test(signature) || signature.length > MAX_SIGNATURE_CHARS) return { ok: false, error: 'Please draw your signature (Igani signs first).' }
  const link = createContractLink(
    { name: data.name.trim(), email: data.email.trim(), effectiveDate: data.effectiveDate, figures: data.figures },
    { name: user.name || user.email, email: user.email, signature },
  )
  return { ok: true, url: link.url, expiresAt: link.expiresAt.toISOString() }
}
