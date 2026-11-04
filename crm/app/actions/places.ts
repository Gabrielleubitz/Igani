'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { requireUser, type SessionUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { PROSPECT_STATUS_LABEL, assertCanUseList } from '@/lib/call-lists'
import { phoneKey } from '@/lib/leads'
import { PLACES_LIMITS, PLACES_MAX_PAGES, PlacesError, placesKey, placesQuery, searchPlaces, websiteHost, type PlaceResult } from '@/lib/places'
import { prisma } from '@/lib/prisma'
import { enrichPending } from '@/lib/prospect-details'
import { toActionError, type ActionResult } from './result'

const callers = ['ADMIN', 'SALES'] as const

/**
 * The CRM already knows this business: it's a lead (`id` only when the person may open it), or it's on a call list
 * (`listId` only when the person may open that list).
 */
export type Known =
  | { kind: 'lead'; id: string | null; owner: string | null }
  | { kind: 'list'; listId: string | null; list: string; owner: string | null; status: string }
export type FoundPlace = PlaceResult & { existing: Known | null }

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
 * Which of these businesses the CRM already has: as a lead (same phone or same website) or on any call list (same
 * phone). Phones match on the last 8 digits: Google lists +972 2-123-4567 where a lead may have 02-123-4567, and an
 * Israeli landline has only 8 digits after the 0.
 */
async function matchKnown(places: PlaceResult[], user: SessionUser): Promise<Map<string, Known>> {
  const keys = [...new Set(places.map((p) => phoneKey(p.phone)?.slice(-8)).filter((k): k is string => Boolean(k)))]
  const hosts = [...new Set(places.map((p) => websiteHost(p.website)).filter((h): h is string => Boolean(h)))]
  if (!keys.length && !hosts.length) return new Map()
  const [leads, prospects] = await Promise.all([
    prisma.$queryRaw<{ id: string; assignedToId: string | null; ownerName: string | null; ownerEmail: string | null; pkey: string | null; host: string | null }[]>`
      SELECT l.id, l."assignedToId", u.name AS "ownerName", u.email AS "ownerEmail",
        CASE WHEN l.phone IS NULL THEN NULL ELSE right(regexp_replace(l.phone, '[^0-9]', '', 'g'), 8) END AS pkey,
        CASE WHEN l.website IS NULL THEN NULL ELSE regexp_replace(lower(l.website), '^(https?://)?(www\\.)?([^/:?#]+).*$', '\\3') END AS host
      FROM "Lead" l LEFT JOIN "User" u ON u.id = l."assignedToId"
      WHERE (l.phone IS NOT NULL AND right(regexp_replace(l.phone, '[^0-9]', '', 'g'), 8) = ANY(${keys}::text[]))
         OR (l.website IS NOT NULL AND regexp_replace(lower(l.website), '^(https?://)?(www\\.)?([^/:?#]+).*$', '\\3') = ANY(${hosts}::text[]))`,
    prisma.$queryRaw<{ listId: string; listName: string; ownerId: string | null; ownerName: string | null; ownerEmail: string | null; status: keyof typeof PROSPECT_STATUS_LABEL; pkey: string }[]>`
      SELECT p."listId", c.name AS "listName", c."ownerId", u.name AS "ownerName", u.email AS "ownerEmail", p.status::text AS status,
        right(regexp_replace(p.phone, '[^0-9]', '', 'g'), 8) AS pkey
      FROM "Prospect" p JOIN "CallList" c ON c.id = p."listId" LEFT JOIN "User" u ON u.id = c."ownerId"
      WHERE p.status <> 'CONVERTED' AND right(regexp_replace(p.phone, '[^0-9]', '', 'g'), 8) = ANY(${keys}::text[])`,
  ])
  const out = new Map<string, Known>()
  for (const p of places) {
    const k = phoneKey(p.phone)?.slice(-8)
    const h = websiteHost(p.website)
    const lead = leads.find((r) => (k && r.pkey === k) || (h && r.host === h))
    if (lead) {
      const visible = user.role === 'ADMIN' || lead.assignedToId === user.id
      out.set(p.placeId, { kind: 'lead', id: visible ? lead.id : null, owner: lead.assignedToId ? (lead.ownerName ?? lead.ownerEmail) : null })
      continue
    }
    const onList = k ? prospects.find((r) => r.pkey === k) : undefined
    if (onList) {
      const mine = onList.ownerId === user.id
      out.set(p.placeId, {
        kind: 'list',
        listId: mine || user.role === 'ADMIN' ? onList.listId : null,
        list: onList.listName,
        owner: mine ? null : onList.ownerId ? (onList.ownerName ?? onList.ownerEmail) : null,
        status: PROSPECT_STATUS_LABEL[onList.status] ?? onList.status,
      })
    }
  }
  return out
}

const searchSchema = z.object({
  what: z.string().trim().min(2, 'Type what kind of business').max(100),
  where: z.string().trim().max(100).default(''),
  pageToken: z.string().max(2000).nullish(),
  page: z.number().int().min(1).max(PLACES_MAX_PAGES).default(1),
})

/** One page of Google Maps results for "what" in "where", each marked if the CRM already has it. */
export async function findBusinesses(input: z.input<typeof searchSchema>): Promise<ActionResult<{ query: string; places: FoundPlace[]; nextPageToken: string | null; page: number }>> {
  try {
    const user = await requireUser([...callers])
    const { what, where, pageToken, page } = searchSchema.parse(input)
    if (!placesKey()) throw new PlacesError('Google search isn’t set up yet: add GOOGLE_MAPS_API_KEY to the CRM’s environment variables.')
    await assertSearchAllowed(user)
    const query = placesQuery(what, where)
    const res = await searchPlaces(query, pageToken)
    await logActivity({ entityType: 'USER', entityId: user.id, actorId: user.id, action: SEARCH, metadata: { query, page, results: res.places.length } })
    const existing = await matchKnown(res.places, user)
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
  hours: z.array(z.string().max(120)).max(7).nullable().default(null),
})

const addSchema = z
  .object({
    query: z.string().trim().min(1).max(220),
    places: z.array(placeSchema).min(1).max(PLACES_MAX_PAGES * 20),
    /** add to this list… */
    listId: z.string().cuid().optional(),
    /** …or start a new one (admins can make it for a teammate) */
    newList: z.object({ name: z.string().trim().min(1).max(120), ownerId: z.string().cuid().optional() }).optional(),
  })
  .refine((d) => Boolean(d.listId) !== Boolean(d.newList), { message: 'Pick a call list or name a new one', path: ['listId'] })

/**
 * Put the ticked businesses on a call list. Skipped: no phone, already a lead, already on a call list, or ticked twice.
 */
export async function addToCallList(input: z.input<typeof addSchema>): Promise<ActionResult<{ listId: string; listName: string; added: number; skipped: number }>> {
  try {
    const user = await requireUser([...callers])
    const data = addSchema.parse(input)
    let ownerId = user.id
    if (data.newList?.ownerId && data.newList.ownerId !== user.id) {
      if (user.role !== 'ADMIN') throw new BookingError('Only admins can make a list for someone else.', 'FORBIDDEN')
      const owner = await prisma.user.findUnique({ where: { id: data.newList.ownerId }, select: { role: true } })
      if (!owner || owner.role === 'MARKETING') throw new BookingError('Pick a salesperson or admin.', 'INVALID_STATE')
      ownerId = data.newList.ownerId
    }
    if (data.listId) await assertCanUseList(data.listId, user)
    const withPhone = data.places.filter((p) => phoneKey(p.phone))
    const result = await prisma.$transaction(
      async (tx) => {
        // One at a time, so two people adding the same search can't both get a business.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('places.import'))`
        const list = data.listId
          ? await tx.callList.update({ where: { id: data.listId }, data: { updatedAt: new Date() }, select: { id: true, name: true } })
          : await tx.callList.create({ data: { name: data.newList!.name, ownerId, query: data.query }, select: { id: true, name: true } })
        const known = await matchKnown(withPhone, user)
        const seen = new Set<string>()
        const rows = withPhone.filter((p) => {
          const key = phoneKey(p.phone)!.slice(-8)
          if (known.has(p.placeId) || seen.has(key)) return false
          seen.add(key)
          return true
        })
        const created = await tx.prospect.createMany({
          data: rows.map((p) => ({
            listId: list.id,
            placeId: p.placeId,
            name: p.name,
            phone: p.phone!,
            website: p.website,
            address: p.address,
            category: p.category,
            rating: p.rating,
            reviews: p.reviews,
            mapsUrl: p.mapsUrl,
            details: p.hours ? { hours: p.hours } : undefined,
            // their website is read next for other numbers, emails and named contacts
            enrichStatus: p.website ? 'pending' : 'none',
          })),
          skipDuplicates: true,
        })
        return { listId: list.id, listName: list.name, added: created.count, skipped: data.places.length - created.count }
      },
      { timeout: 30_000 },
    )
    await logActivity({ entityType: 'USER', entityId: user.id, actorId: user.id, action: 'places.to_call_list', metadata: { query: data.query, ...result } })
    revalidatePath('/sales/call-lists')
    if (result.added) {
      // Read their websites after the response (the hourly job picks up anything left over).
      const run = (): Promise<void> => enrichPending({ limit: 60, budgetMs: 240_000 }).then(() => undefined).catch((err: unknown) => console.error('[places] details lookup failed', err))
      try {
        after(run)
      } catch {
        void run()
      }
    }
    return { ok: true, data: result }
  } catch (err) {
    return toActionError(err)
  }
}
