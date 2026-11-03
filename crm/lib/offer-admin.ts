import 'server-only'
import type { OfferStatus } from '@prisma/client'
import type { LeadOption } from '@/components/admin/OfferForms'
import { leadName } from './format'
import { slugify } from './offer-modules'
import { prisma } from './prisma'

export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = { DRAFT: 'Draft', LIVE: 'Live', SIGNED: 'Signed', ARCHIVED: 'Archived' }
export const OFFER_STATUS_TONE: Record<OfferStatus, string> = {
  DRAFT: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  LIVE: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  SIGNED: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  ARCHIVED: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}

/** Leads to pick from when creating an offer (most recently active first). */
export async function leadOptions(): Promise<LeadOption[]> {
  const leads = await prisma.lead.findMany({
    where: { status: { not: 'LOST' } },
    orderBy: { updatedAt: 'desc' },
    take: 1000,
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true },
  })
  return leads.map((l) => {
    const name = leadName(l)
    return { id: l.id, label: [name, l.company, l.email].filter((x, i, a) => x && a.indexOf(x) === i).join(' · '), suggestedSlug: slugify(l.company || name).slice(0, 30) }
  })
}
