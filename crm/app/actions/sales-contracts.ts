'use server'

import { requireUser } from '@/lib/auth'
import { createContractLink } from '@/lib/sales-contract'
import { validate, type ContractData } from '@/lib/sales-contract-core'
import { PNG_DATA_URL } from '@/lib/sales-contract-token'
import { getSetting } from '@/lib/settings'

export type LinkResultAction = { ok: true; url: string; expiresAt: string } | { ok: false; error: string }

/** Admin only. Signs with Igani's saved signature and makes a short link; the agreement is kept for 12 hours or until signed. */
export async function generateContractLink(data: ContractData): Promise<LinkResultAction> {
  const user = await requireUser(['ADMIN'])
  const err = validate(data)
  if (err) return { ok: false, error: err }
  const [signer, signature] = await Promise.all([getSetting('contract.signer'), getSetting('contract.signature')])
  if (!signature || !PNG_DATA_URL.test(signature)) return { ok: false, error: 'Save the Igani signature first: Admin → Settings → Contract signer.' }
  const link = await createContractLink(
    { name: data.name.trim(), email: data.email.trim(), effectiveDate: data.effectiveDate, figures: data.figures },
    { name: signer.name || user.name || user.email, email: user.email, signature },
  )
  return { ok: true, url: link.url, expiresAt: link.expiresAt.toISOString() }
}
