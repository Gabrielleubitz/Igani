import 'server-only'
import { prisma } from './prisma'
import { pendingLinkFor } from './sales-contract'

export interface TermsLock {
  /** signed = the salesperson signed the agreement; pending = it was sent and is waiting for their signature */
  kind: 'signed' | 'pending'
  at: Date
}

/**
 * A salesperson's commission terms are fixed by their agreement: from the moment a contract with the figures is created and sent,
 * until (and after) they sign it. Returns the lock, or null while no agreement exists and the terms can still be edited.
 */
export async function termsLockedBy(email: string | null | undefined): Promise<TermsLock | null> {
  if (!email) return null
  const signed = await prisma.agreementAcceptance.findFirst({ where: { email: email.trim().toLowerCase() }, orderBy: { signedAt: 'desc' }, select: { signedAt: true } })
  if (signed) return { kind: 'signed', at: signed.signedAt }
  const pending = await pendingLinkFor(email)
  return pending ? { kind: 'pending', at: pending.expiresAt } : null
}

export const lockedMessage = (lock: TermsLock): string =>
  lock.kind === 'signed'
    ? 'These commission terms are locked by the agreement the salesperson signed. To change them, send a new agreement with the new figures.'
    : 'A contract with these commission figures was sent and is waiting for signature, so they are locked. To change them, send a new agreement with the new figures from the agreement form: it replaces the link.'
