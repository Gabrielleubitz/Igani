'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { requireUser, type SessionUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { phoneKey } from '@/lib/leads'
import { PLACES_LIMITS, PLACES_MAX_PAGES, PlacesError, placesKey, placesQuery, searchPlaces, websiteHost, type PlaceResult } from '@/lib/places'
import { prisma } from '@/lib/prisma'
import { toActionError, type ActionResult } from './result'

/** Who already has this business as a lead. `id` only when the person may open it. */
export type ExistingLead = { id: string | null; owner: string | null }
export type FoundPlace = PlaceResult & { existing: ExistingLead | null }

const SEARCH = 'places.search'

async function assertSearchAllowed(user: SessionUser): Promise<void> {
  const now = Date.now()
  const hour = new Date(now - 3600_000)
  const day = new Date(now - 86_400_000)
  const [mineHour, mineDay, team] = await Promise.all([
    prisma.activityLog.count({ where: { action: SEARCH, actorId: user.id, createdAt: { gte: hour } } }),
    prisma.activityLog.count({ where: { action: SEARCH, actorId: user.id, createdAt: { gte: day } } }),
    prisma.activityLog.count({ where: { action: SEARCH, createdAt: { gte: day } } }),
  ])
  if (mineHour >= PLACES_LIMITS.perUserHour) throw new BookingError('That’s a lot of searches this hour. Take a break and try again later.', 'INVALID_STATE')
  if (mineDay >= PLACES_LIMITS.perUserDay || team >= PLACES_LIMITS.teamDay) throw new BookingError('Today’s Google search allowance is used up. Try again tomorrow.', 'INVALID_STATE')
}

/**
 * Which of these businesses are already leads (same phone or same website). Phones match on the last 8 digits:
 * Google lists +972 2-123-4567 where a lead may have 02-123-4567, and an Israeli landline has only 8 digits after the 0.
 */
async function matchExisting(places: PlaceResult[], user: SessionUser): Promise<Map<string, ExistingLead>> {
  const keys = [...new Set(places.map((p) => phoneKey(p.phone)?.slice(-8)).filter((k): k is string => Boolean(k)))]
  const hosts = [...new Set(places.map((p) => websiteHost(p.website)).filter((h): h is string => Boolean(h)))]
  if (!keys.length && !hosts.length) return new Map()
  const rows = await prisma.$queryRaw<{ id: string; assignedToId: string | null; ownerName: string | null; ownerEmail: string | null; pkey: string | null; host: string | null }[]>`
    SELECT l.id, l."assignedToId", u.name AS "ownerName", u.email AS "ownerEmail",
      CASE WHEN l.phone IS NULL THEN NULL ELSE right(regexp_replace(l.phone, '[^0-9]', '', 'g'), 8) END AS pkey,
      CASE WHEN l.website IS NULL THEN NULL ELSE regexp_replace(lower(l.website), '^(https?://)?(www\\.)?([^/:?#]+).*$', '\\3') END AS host
    FROM "Lead" l LEFT JOIN "User" u ON u.id = l."assignedToId"
    WHERE (l.phone IS NOT NULL AND right(regexp_replace(l.phone, '[^0-9]', '', 'g'), 8) = ANY(${keys}::text[]))
       OR (l.website IS NOT NULL AND regexp_replace(lower(l.website), '^(https?://)?(www\\.)?([^/:?#]+).*$', '\\3') = ANY(${hosts}::text[]))`
  const out = new Map<string, ExistingLead>()
  for (const p of places) {
    const k = phoneKey(p.phone)?.slice(-8)
    const h = websiteHost(p.website)
    const row = rows.find((r) => (k && r.pkey === k) || (h && r.host === h))
    if (!row) continue
    const visible = user.role === 'ADMIN' || row.assignedToId === user.id
    out.set(p.placeId, { id: visible ? row.id : null, owner: row.assignedToId ? (row.ownerName ?? row.ownerEmail) : null })
  }
  return out
}

const searchSchema = z.object({
  what: z.string().trim().min(2, 'Type what kind of business').max(100),
  where: z.string().trim().max(100).default(''),
  pageToken: z.string().max(2000).nullish(),
  page: z.number().int().min(1).max(PLACES_MAX_PAGES).default(1),
})

/** One page of Google Maps results for "what" in "where", each marked if it's already a lead. */
export async function findBusinesses(input: z.input<typeof searchSchema>): Promise<ActionResult<{ query: string; places: FoundPlace[]; nextPageToken: string | null; page: number }>> {
  try {
    const user = await requireUser()
    const { what, where, pageToken, page } = searchSchema.parse(input)
    if (!placesKey()) throw new PlacesError('Google search isn’t set up yet: add GOOGLE_MAPS_API_KEY to the CRM’s environment variables.')
    await assertSearchAllowed(user)
    const query = placesQuery(what, where)
    const res = await searchPlaces(query, pageToken)
    await logActivity({ entityType: 'USER', entityId: user.id, actorId: user.id, action: SEARCH, metadata: { query, page, results: res.places.length } })
    const existing = await matchExisting(res.places, user)
    return {
      ok: true,
      data: {
        query,
        places: res.places.map((p) => ({ ...p, existing: existing.get(p.placeId) ?? null })),
        nextPageToken: page < PLACES_MAX_PAGES ? res.nextPageToken : null,
        page,
      },
    }
  } catch (err) {
    if (err instanceof PlacesError) return { ok: false, error: err.message }
    return toActionError(err)
  }
}

const placeSchema = z.object({
  placeId: z.string().trim().min(1).max(300),
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(40).nullable(),
  website: z.string().trim().max(500).url().refine((u) => /^https?:\/\//i.test(u)).nullable(),
  address: z.string().trim().max(300).nullable(),
  rating: z.number().min(0).max(5).nullable(),
  reviews: z.number().int().min(0).nullable(),
  mapsUrl: z.string().trim().max(500).url().refine((u) => u.startsWith('https://')).nullable(),
  category: z.string().trim().max(80).nullable(),
})

const importSchema = z.object({
  query: z.string().trim().min(1).max(220),
  places: z.array(placeSchema).min(1).max(PLACES_MAX_PAGES * 20),
})

/** Add the ticked businesses as leads. Ones that are already leads (or have no phone) are skipped. */
export async function importBusinesses(input: z.input<typeof importSchema>): Promise<ActionResult<{ added: number; skipped: number }>> {
  try {
    const user = await requireUser()
    const { query, places } = importSchema.parse(input)
    const withPhone = places.filter((p) => phoneKey(p.phone))
    const result = await prisma.$transaction(
      async (tx) => {
        // One import at a time, so two people importing the same search can't both add a business.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('places.import'))`
        const existing = await matchExisting(withPhone, user)
        const seen = new Set<string>()
        let added = 0
        for (const p of withPhone) {
          const key = phoneKey(p.phone)!.slice(-8)
          if (existing.has(p.placeId) || seen.has(key)) continue
          seen.add(key)
          const details = [
            p.category,
            p.address,
            p.rating != null ? `Google rating ${p.rating}${p.reviews != null ? ` (${p.reviews} reviews)` : ''}` : null,
            p.mapsUrl ? `Google Maps: ${p.mapsUrl}` : null,
          ].filter(Boolean)
          const lead = await tx.lead.create({
            data: {
              company: p.name,
              phone: p.phone,
              website: p.website,
              message: details.length ? `Found on Google Maps (“${query}”).\n${details.join('\n')}` : `Found on Google Maps (“${query}”).`,
              source: 'Google Places',
              sourceDetail: `Google Maps · ${query}`.slice(0, 300),
              tags: ['google-places', 'cold'],
              // Reps own what they add; admins/marketing leave it unassigned, like adding a lead by hand.
              assignedToId: user.role === 'SALES' ? user.id : null,
            },
          })
          await logActivity({ entityType: 'LEAD', entityId: lead.id, action: 'lead.created', actorId: user.id, metadata: { source: 'Google Places', sourceDetail: lead.sourceDetail, placeId: p.placeId } }, tx)
          added++
        }
        return { added, skipped: places.length - added }
      },
      { timeout: 30_000 },
    )
    await logActivity({ entityType: 'USER', entityId: user.id, actorId: user.id, action: 'places.import', metadata: { query, ...result } })
    revalidatePath('/sales', 'layout')
    revalidatePath('/admin/leads')
    return { ok: true, data: result }
  } catch (err) {
    return toActionError(err)
  }
}
