import type { Prisma } from '@prisma/client'

/**
 * Who can see an offer: admins see every offer; a salesperson sees only offers they created or were invited to.
 * Salespeople don't have the Offers pages yet: flip OFFERS_FOR_SALES (and move the pages out of /admin) when they do.
 * Every Offers page, action and API checks through these helpers, so the rule lives in one place.
 */
export const OFFERS_FOR_SALES = false

type Viewer = { id: string; role: string | null }
type OfferRef = { createdById: string | null; memberIds: string[] }

export function canSeeOffer(user: Viewer, o: OfferRef): boolean {
  if (user.role === 'ADMIN') return true
  if (!OFFERS_FOR_SALES || user.role !== 'SALES') return false
  return o.createdById === user.id || o.memberIds.includes(user.id)
}

/** Prisma filter for the offers a user may list. */
export function offerScope(user: Viewer): Prisma.OfferWhereInput {
  if (user.role === 'ADMIN') return {}
  if (!OFFERS_FOR_SALES || user.role !== 'SALES') return { id: { in: [] } }
  return { OR: [{ createdById: user.id }, { memberIds: { has: user.id } }] }
}

/** Publishing, contracts, inviting teammates and deleting stay with admins even once salespeople have offers. */
export const canAdministerOffer = (user: Viewer): boolean => user.role === 'ADMIN'
