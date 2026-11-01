import type { Prisma } from '@prisma/client'

/**
 * Archiving is personal: "I'm done with this lead" hides it from that person's lists only. Everyone else still sees it and
 * no statistic changes. These two fragments are the only place that rule lives.
 */
export const notArchivedBy = (userId: string): Prisma.LeadWhereInput => ({ archives: { none: { userId } } })
export const archivedBy = (userId: string): Prisma.LeadWhereInput => ({ archives: { some: { userId } } })
