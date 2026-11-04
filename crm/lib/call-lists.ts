/**
 * Call lists: businesses to cold-call (from "Find businesses"). A prospect is not a lead yet; it becomes one when a call
 * goes well ("Interested" in the wrap-up, or "Make lead" on the list). Lists belong to the teammate who calls them;
 * admins see every list.
 */
import type { Prisma, ProspectStatus, LeadStatus } from '@prisma/client'
import { logActivity } from '@/lib/audit'
import type { SessionUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { findExistingLead } from '@/lib/leads'
import { formatPhone } from '@/lib/phone-numbers'
import { asDetails, type ProspectDetails } from '@/lib/prospect-details'
import { prisma } from '@/lib/prisma'

type Db = Prisma.TransactionClient | typeof prisma
type Viewer = Pick<SessionUser, 'id' | 'role'>

/** Still worth calling. */
export const OPEN_PROSPECT: ProspectStatus[] = ['TO_CALL', 'CALLBACK']

export const PROSPECT_STATUS_LABEL: Record<ProspectStatus, string> = {
  TO_CALL: 'To call',
  CALLBACK: 'Call back',
  CONVERTED: 'Became a lead',
  NOT_INTERESTED: 'Not interested',
  BAD_NUMBER: 'Wrong number',
}

export function listScope(user: Viewer): Prisma.CallListWhereInput {
  return user.role === 'ADMIN' ? {} : { ownerId: user.id }
}

export async function assertCanUseList(listId: string, user: Viewer, db: Db = prisma): Promise<{ id: string; name: string; ownerId: string | null; query: string | null }> {
  const list = await db.callList.findUnique({ where: { id: listId }, select: { id: true, name: true, ownerId: true, query: true } })
  if (!list || (user.role !== 'ADMIN' && list.ownerId !== user.id)) throw new BookingError('Call list not found.', 'NOT_FOUND')
  return list
}

export async function assertCanUseProspect(prospectId: string, user: Viewer, db: Db = prisma) {
  const p = await db.prospect.findUnique({ where: { id: prospectId }, include: { list: { select: { id: true, name: true, ownerId: true, query: true } } } })
  if (!p || (user.role !== 'ADMIN' && p.list.ownerId !== user.id)) throw new BookingError('Not found on your call lists.', 'NOT_FOUND')
  return p
}

/**
 * Turn a prospect into a lead (or link it to the lead that already has its number), owned by whoever made it a lead.
 * Moves it to Contacted (they've just talked) and attaches the call, so its recording and coaching land on the lead.
 */
export async function convertProspect(
  prospectId: string,
  user: Viewer,
  opts: { callId?: string | null; notes?: string | null; status?: LeadStatus } = {},
): Promise<{ leadId: string; created: boolean }> {
  return prisma.$transaction(async (tx) => {
    // Lock the row: a double click or two tabs must not create two leads.
    await tx.$queryRaw`SELECT id FROM "Prospect" WHERE id = ${prospectId} FOR UPDATE`
    const p = await assertCanUseProspect(prospectId, user, tx)
    if (p.status === 'CONVERTED' && p.leadId) return { leadId: p.leadId, created: false }
    const existing = await findExistingLead(tx, undefined, p.phone)
    let leadId: string
    let created = false
    if (existing) {
      leadId = existing.id
    } else {
      const d = asDetails(p.details)
      const person = d.contacts?.[0]
      // the first email no other contact already uses
      let email: string | null = null
      for (const e of [person?.email, ...(d.emails ?? [])].filter((x): x is string => Boolean(x))) {
        if (!(await tx.lead.findUnique({ where: { email: e }, select: { id: true } }))) {
          email = e
          break
        }
      }
      const [firstName, ...rest] = (person?.name ?? '').split(/\s+/).filter(Boolean)
      const lead = await tx.lead.create({
        data: {
          company: p.name,
          phone: p.phone,
          email,
          firstName: firstName ?? null,
          lastName: rest.join(' ') || null,
          website: p.website,
          message: prospectSummary(p, d).slice(0, 8000),
          source: p.placeId ? 'Google Places' : 'Call list',
          sourceDetail: (p.list.query ? `Google Maps · ${p.list.query}` : `Call list · ${p.list.name}`).slice(0, 300),
          tags: ['cold-call', ...(p.placeId ? ['google-places'] : [])],
          status: opts.status ?? 'CONTACTED',
          assignedToId: user.role === 'MARKETING' ? null : user.id,
        },
      })
      leadId = lead.id
      created = true
      await logActivity({ entityType: 'LEAD', entityId: lead.id, action: 'lead.created', actorId: user.id, metadata: { source: lead.source, sourceDetail: lead.sourceDetail, prospectId: p.id, callList: p.list.name } }, tx)
    }
    await tx.prospect.update({ where: { id: p.id }, data: { status: 'CONVERTED', leadId, ...(opts.notes ? { notes: opts.notes } : {}) } })
    // Every earlier call to this business moves onto the lead too.
    await tx.call.updateMany({ where: { prospectId: p.id, leadId: null }, data: { leadId } })
    if (opts.notes) await tx.leadNote.create({ data: { leadId, authorId: user.id, body: opts.notes } })
    return { leadId, created }
  })
}

/** What a wrap-up outcome does to a prospect (an "interested" call is converted separately). */
export function prospectStatusFor(outcome: string, current: ProspectStatus): ProspectStatus {
  switch (outcome) {
    case 'callback':
      return 'CALLBACK'
    case 'not_interested':
      return 'NOT_INTERESTED'
    case 'wrong_number':
      return 'BAD_NUMBER'
    default:
      // no answer, voicemail, busy, connected: still to call (a pending call-back stays a call-back)
      return current === 'CALLBACK' ? 'CALLBACK' : 'TO_CALL'
  }
}

/** Everything we know about the business, as the new lead's message. */
export function prospectSummary(
  p: { name: string; category: string | null; address: string | null; rating: number | null; reviews: number | null; mapsUrl: string | null; list: { name: string } },
  d: ProspectDetails,
): string {
  const lines: (string | null | false | undefined)[] = [
    `From the call list “${p.list.name}”.`,
    d.summary,
    d.services?.length ? `Services: ${d.services.join(', ')}` : null,
    p.category,
    p.address,
    p.rating != null ? `Google rating ${p.rating}${p.reviews != null ? ` (${p.reviews} reviews)` : ''}` : null,
    ...(d.contacts ?? []).map((c) => `Contact: ${[c.name, c.role, c.phone ? formatPhone(c.phone) : null, c.email].filter(Boolean).join(' · ')}`),
    d.phones?.length ? `Other numbers: ${d.phones.map(formatPhone).join(', ')}` : null,
    d.whatsapp?.length ? `WhatsApp: ${d.whatsapp.map(formatPhone).join(', ')}` : null,
    d.emails?.length ? `Emails: ${d.emails.join(', ')}` : null,
    ...(d.socials ?? []).map((s) => `${s.kind[0]!.toUpperCase()}${s.kind.slice(1)}: ${s.url}`),
    d.hours?.length ? `Hours:\n${d.hours.join('\n')}` : null,
    p.mapsUrl ? `Google Maps: ${p.mapsUrl}` : null,
  ]
  return lines.filter(Boolean).join('\n')
}
