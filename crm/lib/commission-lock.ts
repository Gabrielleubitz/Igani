import 'server-only'
import { prisma } from './prisma'

/**
 * A salesperson's commission terms are fixed by the agreement they signed (the figures entered when the contract was made).
 * Returns when they signed, or null while there is no signed agreement and the terms can still be edited.
 */
export async function termsLockedBy(email: string | null | undefined): Promise<{ signedAt: Date } | null> {
  if (!email) return null
  return prisma.agreementAcceptance.findFirst({ where: { email: email.trim().toLowerCase() }, orderBy: { signedAt: 'desc' }, select: { signedAt: true } })
}

export const LOCKED_MESSAGE = 'These commission terms are locked by the agreement the salesperson signed. To change them, send a new agreement with the new figures.'
