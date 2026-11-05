/**
 * Caller ID for the CRM: who is behind this phone number? Checked in order of how much we trust it:
 *  1. a lead (any teammate's: a rep sees the name only for their own or unassigned leads, else just whose it is),
 *  2. a business on a call list, including the other numbers and named people found on its website,
 *  3. the business's public Google listing for that exact number (looked up once per number, cached in PhoneLabel).
 * Used by the dialer keypad, incoming calls and the new-contact form, so a client already in the CRM is recognised
 * however the number is typed.
 */
import 'server-only'
import { Prisma } from '@prisma/client'
import type { SessionUser } from './auth'
import { callBlockedByOwner } from './call-status'
import { leadName } from './format'
import { PLACES_LIMITS, placesKey, searchPlaces } from './places'
import { phoneMatchSql, samePhone } from './phone-match'
import { formatPhone, toE164 } from './phone-numbers'
import { prisma } from './prisma'
import { asDetails } from './prospect-details'

type Viewer = Pick<SessionUser, 'id' | 'role'>

export interface CallerId {
  number: string
  display: string
  /** The best name to show: the person, else the business */
  title: string | null
  /** The line under it: the business, the list it's on, or where the label came from */
  subtitle: string | null
  lead: {
    /** null when this person may not open it (another rep's lead) */
    id: string | null
    name: string | null
    company: string | null
    owner: string | null
    mine: boolean
    /** another rep's lead: the call would be refused */
    blocked: boolean
  } | null
  prospect: { id: string; name: string; listId: string; list: string; person: string | null } | null
  /** From the business's Google listing */
  label: { company: string; category: string | null; address: string | null; website: string | null } | null
}

/** A missed Google lookup is tried again after this long (businesses list new numbers). */
const MISS_RETRY_MS = 30 * 86_400_000
const LOOKUP = 'places.phone_lookup'

function personName(l: { firstName: string | null; lastName: string | null }): string | null {
  return [l.firstName, l.lastName].filter(Boolean).join(' ') || null
}

async function findLead(e164: string, user: Viewer): Promise<CallerId['lead']> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "Lead" WHERE phone IS NOT NULL AND ${phoneMatchSql(Prisma.sql`phone`, e164)} ORDER BY "createdAt" ASC LIMIT 20`
  if (!rows.length) return null
  const leads = await prisma.lead.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    select: { id: true, firstName: true, lastName: true, email: true, company: true, assignedToId: true, createdAt: true, assignedTo: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  })
  // the one you can open wins (yours, then unassigned), else the oldest
  const pick = leads.find((l) => l.assignedToId === user.id) ?? leads.find((l) => !l.assignedToId) ?? leads[0]
  if (!pick) return null
  const open = user.role === 'ADMIN' || pick.assignedToId === user.id || !pick.assignedToId
  return {
    id: user.role === 'ADMIN' || pick.assignedToId === user.id ? pick.id : null,
    name: open ? personName(pick) ?? (pick.company ? null : leadName(pick)) : null,
    company: pick.company,
    owner: pick.assignedTo ? pick.assignedTo.name || pick.assignedTo.email : null,
    mine: pick.assignedToId === user.id,
    blocked: callBlockedByOwner(pick, user),
  }
}

/** A call-list business with this number: its main number, or one found on its website (with the person it belongs to). */
async function findProspect(e164: string, user: Viewer): Promise<CallerId['prospect']> {
  const any = Prisma.sql`(${phoneMatchSql(Prisma.sql`p.phone`, e164)}
    OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(p.details->'phones') = 'array' THEN p.details->'phones' ELSE '[]'::jsonb END) x WHERE ${phoneMatchSql(Prisma.sql`x`, e164)})
    OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(p.details->'whatsapp') = 'array' THEN p.details->'whatsapp' ELSE '[]'::jsonb END) x WHERE ${phoneMatchSql(Prisma.sql`x`, e164)})
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p.details->'contacts') = 'array' THEN p.details->'contacts' ELSE '[]'::jsonb END) c WHERE ${phoneMatchSql(Prisma.sql`c->>'phone'`, e164)}))`
  const owned = user.role === 'ADMIN' ? Prisma.sql`true` : Prisma.sql`c."ownerId" = ${user.id}`
  const rows = await prisma.$queryRaw<{ id: string; name: string; phone: string; details: Prisma.JsonValue; listId: string; list: string }[]>`
    SELECT p.id, p.name, p.phone, p.details, p."listId", c.name AS list
    FROM "Prospect" p JOIN "CallList" c ON c.id = p."listId"
    WHERE ${owned} AND ${any}
    ORDER BY (p.status = 'CONVERTED') ASC, p."updatedAt" DESC LIMIT 1`
  const p = rows[0]
  if (!p) return null
  const contact = samePhone(e164, p.phone) ? null : asDetails(p.details).contacts?.find((c) => samePhone(e164, c.phone))
  return { id: p.id, name: p.name, listId: p.listId, list: p.list, person: contact ? `${contact.name}${contact.role ? ` (${contact.role})` : ''}` : null }
}

async function lookupAllowed(user: Viewer): Promise<boolean> {
  const day = new Date(Date.now() - 86_400_000)
  const [mine, team] = await Promise.all([
    prisma.activityLog.count({ where: { action: { in: [LOOKUP, 'places.search'] }, actorId: user.id, createdAt: { gte: day } } }),
    prisma.activityLog.count({ where: { action: { in: [LOOKUP, 'places.search'] }, createdAt: { gte: day } } }),
  ])
  return mine < PLACES_LIMITS.perUserDay && team < PLACES_LIMITS.teamDay
}

/**
 * The business Google lists at exactly this number. Cached per number (a miss too); a fresh lookup only when allowed
 * (`lookup`), within the shared daily Google allowance, and never for longer than a few seconds.
 */
export async function labelForNumber(e164: string, user: Viewer, lookup: boolean): Promise<CallerId['label']> {
  const cached = await prisma.phoneLabel.findUnique({ where: { number: e164 } })
  const asLabel = (c: { company: string | null; category: string | null; address: string | null; website: string | null } | null): CallerId['label'] =>
    c?.company ? { company: c.company, category: c.category, address: c.address, website: c.website } : null
  if (cached && (cached.company || Date.now() - cached.checkedAt.getTime() < MISS_RETRY_MS)) return asLabel(cached)
  if (!lookup || !placesKey() || !(await lookupAllowed(user))) return asLabel(cached)
  await prisma.activityLog.create({ data: { entityType: 'USER', entityId: user.id, actorId: user.id, action: LOOKUP, metadata: {} } })
  let hit: Awaited<ReturnType<typeof searchPlaces>>['places'][number] | undefined
  try {
    // the number as Israelis and Google write it ("03-123-4567"); Google matches listings by their phone
    const page = await searchPlaces(formatPhone(e164), null, (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(4000) }))
    hit = page.places.find((p) => p.phone && toE164(p.phone) === e164)
  } catch {
    return asLabel(cached) // Google slow or down: try again next time
  }
  const data = { company: hit?.name ?? null, category: hit?.category ?? null, address: hit?.address ?? null, website: hit?.website ?? null, placeId: hit?.placeId ?? null, source: 'google', checkedAt: new Date() }
  await prisma.phoneLabel.upsert({ where: { number: e164 }, create: { number: e164, ...data }, update: data })
  return asLabel(data)
}

/** Who is behind this number, for this person. `lookup` allows asking Google when the CRM doesn't know it. */
export async function identifyNumber(raw: string, user: Viewer, opts: { lookup?: boolean } = {}): Promise<CallerId | null> {
  const e164 = toE164(raw)
  if (!e164) return null
  const [lead, prospect] = await Promise.all([findLead(e164, user), findProspect(e164, user)])
  // Google is only asked about numbers nobody in the CRM has a name for
  const known = Boolean(prospect || lead?.name || lead?.company)
  const label = await labelForNumber(e164, user, !known && Boolean(opts.lookup))
  const business = lead?.company ?? prospect?.name ?? label?.company ?? null
  let title: string | null
  let subtitle: string | null
  if (lead) {
    title = lead.name ?? lead.company ?? label?.company ?? null
    const who = lead.mine ? 'Your lead' : lead.owner ? `${lead.owner}’s lead` : 'Unassigned lead'
    subtitle = [lead.name && business ? business : null, who].filter(Boolean).join(' · ')
  } else if (prospect) {
    title = prospect.person ?? prospect.name
    subtitle = [prospect.person ? prospect.name : null, `On “${prospect.list}”`].filter(Boolean).join(' · ')
  } else if (label) {
    title = label.company
    subtitle = [label.category, 'Google listing'].filter(Boolean).join(' · ')
  } else {
    title = null
    subtitle = null
  }
  return { number: e164, display: formatPhone(e164), title, subtitle, lead, prospect, label }
}
