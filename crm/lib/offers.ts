import 'server-only'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Offer, OfferStatus, Prisma } from '@prisma/client'
import { logActivity } from './audit'
import { OFFERS } from '@/offers/registry'
import type { OfferDefinition } from '@/offers/types'
import { currentUserOrNull } from './auth'
import { canSeeOffer } from './offer-access'
import { parseModules, type OfferModuleItem } from './offer-modules'
import { offerVideos } from './video'
import { prisma } from './prisma'

/** The domain offers live under: honey → honey.app.igani.co. */
export const OFFER_ROOT_DOMAIN = process.env.OFFER_ROOT_DOMAIN ?? 'app.igani.co'
/** Port the local CRM runs on (npm run dev / npm run studio). */
export const STUDIO_APP_PORT = 3100

export function liveOfferUrl(slug: string): string {
  return `https://${slug}.${OFFER_ROOT_DOMAIN}`
}
export function localOfferUrl(slug: string): string {
  return `http://${slug}.localhost:${STUDIO_APP_PORT}`
}

export const isLocalDev = (): boolean => process.env.NODE_ENV === 'development'

export async function loadDefinition(slug: string): Promise<OfferDefinition | null> {
  const load = OFFERS[slug]
  if (!load) return null
  try {
    return await load()
  } catch (err) {
    console.error(`[offers] content for "${slug}" failed to load`, err)
    return null
  }
}

export interface OfferAssets {
  /** Uploaded client logo (studio), shown by the template without Claude */
  logo: string | null
  images: string[]
}

/** offers/<slug>/assets.json, written by the studio when the admin uploads a logo or images. */
export function loadAssets(slug: string): OfferAssets {
  try {
    const raw = JSON.parse(readFileSync(join(process.cwd(), 'offers', slug, 'assets.json'), 'utf8')) as Partial<OfferAssets>
    return { logo: typeof raw.logo === 'string' ? raw.logo : null, images: Array.isArray(raw.images) ? raw.images.filter((x): x is string => typeof x === 'string') : [] }
  } catch {
    return { logo: null, images: [] }
  }
}

export interface PublicOffer {
  offer: Offer & { lead: { firstName: string | null; lastName: string | null; company: string | null; email: string | null; phone: string | null } }
  modules: OfferModuleItem[]
  definition: OfferDefinition | null
  assets: OfferAssets
  /** Private videos attached to this offer (played through the access-checked stream route) */
  videos: { id: string; title: string }[]
  /** True when an admin (or localhost) is looking at a draft */
  preview: boolean
}

/** Statuses a client can open. Drafts only show on localhost or to a signed-in admin. */
const PUBLIC: readonly OfferStatus[] = ['LIVE', 'SIGNED']

export async function loadPublicOffer(slug: string): Promise<PublicOffer | null> {
  const offer = await prisma.offer.findUnique({
    where: { slug },
    include: { lead: { select: { firstName: true, lastName: true, company: true, email: true, phone: true } } },
  })
  if (!offer || offer.status === 'ARCHIVED') return null
  let preview = false
  if (!PUBLIC.includes(offer.status)) {
    if (isLocalDev()) preview = true
    else {
      // Drafts: admins, and the offer's own people once Offers opens to salespeople
      const user = await currentUserOrNull()
      if (!user || !canSeeOffer(user, offer)) return null
      preview = true
    }
  }
  const videos = (await offerVideos(offer.id).catch(() => [])).map((v) => ({ id: v.id, title: v.title }))
  return { offer, modules: parseModules(offer.modules), definition: await loadDefinition(slug), assets: loadAssets(slug), videos, preview }
}

/** The address a client uses: the subdomain in production, <slug>.localhost when running locally. */
export function publicOfferUrl(slug: string): string {
  return isLocalDev() ? localOfferUrl(slug) : liveOfferUrl(slug)
}

/** Lead stages publishing an offer moves forward to Proposal sent (later stages are never pulled back). */
export const BEFORE_PROPOSAL_STAGES = ['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'DEMO_SENT'] as const

/**
 * When an offer goes live, its lead has been sent a proposal: move it to Proposal sent if it is still earlier in the
 * pipeline. Runs inside the publish transaction; returns whether the lead moved.
 */
export async function advanceLeadOnPublish(tx: Prisma.TransactionClient, leadId: string, offerId: string, actorId: string | null, via: 'admin' | 'studio'): Promise<boolean> {
  const lead = await tx.lead.findUnique({ where: { id: leadId }, select: { status: true } })
  if (!lead || !(BEFORE_PROPOSAL_STAGES as readonly string[]).includes(lead.status)) return false
  const moved = await tx.lead.updateMany({ where: { id: leadId, status: lead.status }, data: { status: 'PROPOSAL_SENT' } })
  if (!moved.count) return false
  await logActivity({ entityType: 'LEAD', entityId: leadId, action: 'lead.status_changed', actorId, metadata: { from: lead.status, to: 'PROPOSAL_SENT', auto: 'offer-published', offerId, via } }, tx)
  return true
}

/** Lead stages an online signature may move forward to Signed (never pulls a Won or Lost lead back). */
export const SIGNABLE_LEAD_STAGES = ['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'DEMO_SENT', 'PROPOSAL_SENT'] as const
