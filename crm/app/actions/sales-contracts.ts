'use server'

import { requireUser } from '@/lib/auth'
import { createContractLink } from '@/lib/sales-contract'
import { companyIsComplete, sameName, termsFromCompany, validate, type ContractData } from '@/lib/sales-contract-core'
import { getSetting } from '@/lib/settings'
import { PNG_DATA_URL } from '@/lib/sales-contract-token'
import { prisma } from '@/lib/prisma'

export type LinkResultAction = { ok: true; url: string; expiresAt: string } | { ok: false; error: string }

/** Admin only. Signs with the chosen saved signature (Settings → Signatures) and makes a short link; the agreement is kept for 12 hours or until signed. The signed PDF is emailed to the admin who made the link. */
export async function generateContractLink(data: ContractData, signatureId: string): Promise<LinkResultAction> {
  const user = await requireUser(['ADMIN'])
  // The company details and the fixed legal terms come from Settings, not from the browser; only the representative's address is per agreement
  const company = await getSetting('contract.company')
  if (!companyIsComplete(company)) return { ok: false, error: 'Set the company details first (the Company details card on this page).' }
  if (sameName(company.legalName, data.name)) return { ok: false, error: `The company name in Company details is the same as the salesman’s name (${data.name.trim()}). Put the registered owner’s name there, as on the tax certificate.` }
  data = { ...data, terms: termsFromCompany(company, data.terms.agentAddress) }
  const err = validate(data)
  if (err) return { ok: false, error: err }
  const saved = await prisma.signature.findFirst({ where: { id: signatureId, archivedAt: null } })
  const signer = saved ? { name: saved.name, title: saved.title, signature: saved.image } : null
  if (!signer || !PNG_DATA_URL.test(signer.signature)) return { ok: false, error: 'Pick a saved signature (Settings → Signatures).' }
  const link = await createContractLink(
    { name: data.name.trim(), email: data.email.trim(), effectiveDate: data.effectiveDate, figures: data.figures, terms: data.terms },
    { name: signer.title ? `${signer.name}, ${signer.title}` : signer.name, email: user.email, signature: signer.signature },
  )
  return { ok: true, url: link.url, expiresAt: link.expiresAt.toISOString() }
}
