import type { Prisma } from '@prisma/client'

/** The Calls page's tabs, time windows and search: shared by the website and the iOS app. */
export const VIEWS = ['all', 'talked', 'missed', 'incoming', 'callback'] as const
export type View = (typeof VIEWS)[number]
export const RANGES = ['today', '7d', '30d', 'all'] as const
export type Range = (typeof RANGES)[number]

export const VIEW_WHERE: Record<View, Prisma.CallWhereInput> = {
  all: {},
  talked: { status: 'COMPLETED', durationSec: { gt: 0 } },
  missed: { OR: [{ status: { in: ['BUSY', 'NO_ANSWER', 'FAILED', 'CANCELED'] } }, { status: 'COMPLETED', OR: [{ durationSec: null }, { durationSec: 0 }] }] },
  incoming: { direction: 'INBOUND' },
  callback: { outcome: 'callback' },
}

/** Search by name, company, email or number. */
export function searchWhere(q: string): Prisma.CallWhereInput | null {
  const t = q.trim()
  if (!t) return null
  const or: Prisma.CallWhereInput[] = [
    { lead: { firstName: { contains: t, mode: 'insensitive' } } },
    { lead: { lastName: { contains: t, mode: 'insensitive' } } },
    { lead: { company: { contains: t, mode: 'insensitive' } } },
    { lead: { email: { contains: t, mode: 'insensitive' } } },
    { prospect: { name: { contains: t, mode: 'insensitive' } } },
  ]
  // a full name ("dana levi")
  const [first, ...rest] = t.split(/\s+/)
  if (rest.length) or.push({ lead: { firstName: { contains: first, mode: 'insensitive' }, lastName: { contains: rest.join(' '), mode: 'insensitive' } } })
  // a number, typed any way (050-123-4567, +972 50…): match on the national digits
  const digits = t.replace(/\D/g, '').replace(/^(00)?972/, '').replace(/^0/, '')
  if (digits.length >= 3) or.push({ toNumber: { contains: digits } }, { fromNumber: { contains: digits } })
  return { OR: or }
}

