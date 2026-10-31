import 'server-only'
import type { LeadStatus, Prisma } from '@prisma/client'
import { z } from 'zod'
import { logActivity } from './audit'
import { sendLeadAssignedEmail, sendNewLeadAlertEmail } from './email'
import { getSetting } from './settings'
import { appUrl } from './env'
import { prisma } from './prisma'

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined))

/** Digits-only phone used to match phone-only leads (keeps a leading + country code as digits). */
export function phoneKey(phone: string | null | undefined): string | null {
  const d = (phone ?? '').replace(/\D/g, '')
  return d.length >= 7 ? d : null
}

/** Payload accepted from igani.co forms (contact page, landing pages, funnels). Needs an email or a phone. */
export const leadPayloadSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(z.string().email().optional()),
  firstName: optionalText(100),
  lastName: optionalText(100),
  phone: optionalText(40),
  company: optionalText(200),
  website: optionalText(500),
  message: optionalText(5000),
  budget: optionalText(100),
  source: optionalText(100),
  /** Page, form, campaign or person the lead came from, e.g. "/realestate · hero form" */
  sourceDetail: optionalText(300),
  /** When the visitor originally submitted (ISO). Used by backfills so old leads keep their real date. */
  submittedAt: z.string().datetime({ offset: true }).optional(),
  /** Historical import: no alerts, no auto-assignment. */
  backfill: z.boolean().optional(),
  utm: z
    .object({
      source: optionalText(200),
      medium: optionalText(200),
      campaign: optionalText(200),
      term: optionalText(200),
      content: optionalText(200),
    })
    .partial()
    .optional(),
}).refine((p) => Boolean(p.email || phoneKey(p.phone)), { message: 'An email or a phone number is required', path: ['email'] })

export type LeadPayload = z.infer<typeof leadPayloadSchema>

export type IngestResult = { leadId: string; created: true } | { leadId: string; created: false; needsAssignment: boolean }

/**
 * Dedupe by email (or, for phone-only leads, by phone number): create a new lead, or fill blanks on the existing one.
 * A phone-only lead that later comes back with an email gets the email filled in.
 */
export async function ingestLead(payload: LeadPayload): Promise<IngestResult> {
  const data = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    phone: payload.phone,
    company: payload.company,
    website: payload.website,
    message: payload.message,
    budget: payload.budget,
    utmSource: payload.utm?.source,
    utmMedium: payload.utm?.medium,
    utmCampaign: payload.utm?.campaign,
    utmTerm: payload.utm?.term,
    utmContent: payload.utm?.content,
    sourceDetail: payload.sourceDetail,
    email: payload.email,
  } satisfies Prisma.LeadUpdateInput

  return prisma.$transaction<IngestResult>(async (tx) => {
    const existing = await findExistingLead(tx, payload.email, payload.phone)
    if (existing) {
      const fill: Prisma.LeadUpdateInput = {}
      for (const [key, value] of Object.entries(data) as [keyof typeof data, string | undefined][]) {
        if (value !== undefined && existing[key] == null) fill[key] = value
      }
      // Never overwrite another contact's email via a phone match.
      if (fill.email && (await tx.lead.findUnique({ where: { email: String(fill.email) }, select: { id: true } }))) delete fill.email
      // A returning lead's new message must reach reps: append it (dated) to the stored message.
      if (!payload.backfill && payload.message && existing.message && payload.message !== existing.message) {
        const stamp = new Date().toISOString().slice(0, 10)
        fill.message = `${existing.message}\n\n--- resubmitted ${stamp} ---\n${payload.message}`.slice(0, 20000)
      }
      if (Object.keys(fill).length > 0) await tx.lead.update({ where: { id: existing.id }, data: fill })
      // Re-running a backfill must be a no-op: don't re-log or re-append the same historical submission.
      if (payload.backfill) {
        return { leadId: existing.id, created: false as const, needsAssignment: false }
      }
      await logActivity(
        {
          entityType: 'LEAD',
          entityId: existing.id,
          action: 'lead.resubmitted',
          metadata: { source: payload.source ?? 'igani.co', sourceDetail: payload.sourceDetail ?? null, filled: Object.keys(fill), message: payload.message ?? null },
        },
        tx,
      )
      return { leadId: existing.id, created: false as const, needsAssignment: existing.assignedToId === null }
    }
    const source = payload.source ?? 'igani.co'
    const tags = ['inbound', ...(source === 'igani.co' ? [] : [source.toLowerCase().slice(0, 40)]), ...(payload.utm?.campaign ? [`utm:${payload.utm.campaign.toLowerCase().slice(0, 40)}`] : [])]
    const submitted = payload.submittedAt ? new Date(payload.submittedAt) : null
    const createdAt = submitted && submitted.getTime() < Date.now() ? submitted : undefined
    const lead = await tx.lead.create({ data: { ...data, email: payload.email ?? null, source, tags: payload.backfill ? [...tags, 'imported'] : tags, ...(createdAt ? { createdAt } : {}) } })
    await logActivity(
      { entityType: 'LEAD', entityId: lead.id, action: 'lead.created', metadata: { source: lead.source, sourceDetail: lead.sourceDetail, utmSource: lead.utmSource, ...(payload.backfill ? { backfill: true } : {}) } },
      tx,
    )
    return { leadId: lead.id, created: true as const }
  }).catch(async (err: unknown): Promise<IngestResult> => {
    // Two concurrent submissions with the same email: the loser hits the unique index — treat as a duplicate.
    if (isUniqueViolation(err)) {
      const lead = await findExistingLead(prisma, payload.email, payload.phone)
      if (!lead) throw err
      return { leadId: lead.id, created: false, needsAssignment: lead.assignedToId === null }
    }
    throw err
  })
}

/** Match by email first; otherwise by the last 9 digits of the phone (so 058-447… and +97258447… match). */
async function findExistingLead(db: Prisma.TransactionClient | typeof prisma, email: string | undefined, phone: string | undefined) {
  if (email) {
    const byEmail = await db.lead.findUnique({ where: { email } })
    if (byEmail) return byEmail
  }
  const key = phoneKey(phone)
  if (!key) return null
  const rows = await db.$queryRaw<{ id: string }[]>`SELECT id FROM "Lead" WHERE phone IS NOT NULL AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 9) = right(${key}, 9) ORDER BY "createdAt" ASC LIMIT 1`
  // Only reuse a phone match when it doesn't belong to someone with a different email.
  const match = rows[0] ? await db.lead.findUnique({ where: { id: rows[0].id } }) : null
  return match && (!email || !match.email) ? match : null
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 'P2002'
}

/**
 * Round-robin: give the lead to the active SALES rep (User.role = SALES with an active
 * whitelist entry) who was assigned least recently. A transaction-scoped advisory lock
 * serialises concurrent webhooks so reps are rotated strictly in order.
 * Returns the assignee id, or null if there are no reps or the lead was already assigned.
 */
export async function assignLeadRoundRobin(leadId: string, opts: { force?: boolean } = {}): Promise<string | null> {
  const repId = await roundRobinTx(leadId, opts)
  if (repId) await notifyLeadAssigned(leadId, repId)
  return repId
}

/** Best-effort email to the rep a lead was just assigned to; a mail outage never blocks assignment. */
export async function notifyLeadAssigned(leadId: string, repId: string): Promise<void> {
  try {
    const [lead, rep] = await Promise.all([
      prisma.lead.findUnique({ where: { id: leadId } }),
      prisma.user.findUnique({ where: { id: repId }, select: { email: true, name: true } }),
    ])
    if (!lead || !rep?.email) return
    await sendLeadAssignedEmail(rep.email, {
      repName: rep.name ?? rep.email,
      leadName: [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.email || lead.phone || 'New lead',
      leadEmail: lead.email,
      company: lead.company,
      phone: lead.phone,
      message: lead.message,
      source: lead.source,
      leadUrl: appUrl(`/sales/leads/${lead.id}`),
    })
  } catch (err) {
    console.error('[leads] assignment email failed', leadId, err)
  }
}

async function roundRobinTx(leadId: string, opts: { force?: boolean }): Promise<string | null> {
  return prisma.$transaction(async (tx) => {
    if (!opts.force) {
      const off = await tx.siteSetting.findUnique({ where: { key: 'roundRobin.enabled' } })
      if (off && off.value === false) return null
    }
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('igani:lead-round-robin'))`
    const lead = await tx.lead.findUnique({ where: { id: leadId }, select: { assignedToId: true } })
    if (!lead || lead.assignedToId) return null

    const allowed = await tx.allowedUser.findMany({ where: { role: 'SALES', active: true }, select: { email: true } })
    const reps = allowed.length
      ? await tx.user.findMany({
          where: { role: 'SALES', email: { in: allowed.map((a) => a.email) } },
          select: { id: true, lastLeadAssignedAt: true },
          orderBy: [{ lastLeadAssignedAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }],
        })
      : []
    const rep = reps[0]
    if (!rep) {
      await logActivity({ entityType: 'LEAD', entityId: leadId, action: 'lead.assignment_skipped', metadata: { reason: 'no-active-sales-reps' } }, tx)
      return null
    }
    // Cursor must strictly increase even when several leads land in the same millisecond.
    const latest = reps.reduce((max, r) => Math.max(max, r.lastLeadAssignedAt?.getTime() ?? 0), 0)
    const cursor = new Date(Math.max(Date.now(), latest + 1))
    await tx.user.update({ where: { id: rep.id }, data: { lastLeadAssignedAt: cursor } })
    await tx.lead.update({ where: { id: leadId }, data: { assignedToId: rep.id } })
    await logActivity(
      { entityType: 'LEAD', entityId: leadId, action: 'lead.assigned', metadata: { assignedToId: rep.id, strategy: 'round-robin' } },
      tx,
    )
    return rep.id
  })
}

/** Manual (re)assignment by an ADMIN or SALES user. */
export async function assignLeadManually(leadId: string, assigneeId: string | null, actorId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    if (assigneeId) {
      const user = await tx.user.findUnique({ where: { id: assigneeId }, select: { role: true } })
      if (!user || (user.role !== 'SALES' && user.role !== 'ADMIN')) throw new Error('Assignee must be a SALES or ADMIN user')
    }
    const before = await tx.lead.findUniqueOrThrow({ where: { id: leadId }, select: { assignedToId: true } })
    await tx.lead.update({ where: { id: leadId }, data: { assignedToId: assigneeId } })
    await logActivity(
      { entityType: 'LEAD', entityId: leadId, action: 'lead.assigned', actorId, metadata: { from: before.assignedToId, to: assigneeId, strategy: 'manual' } },
      tx,
    )
  })
  if (assigneeId && assigneeId !== actorId) await notifyLeadAssigned(leadId, assigneeId)
}

export interface StatusExtras {
  lostReason?: string
  dealValue?: number
}

export async function changeLeadStatus(leadId: string, status: LeadStatus, actorId: string | null, extras: StatusExtras = {}): Promise<void> {
  if (status === 'LOST' && !extras.lostReason?.trim()) throw new Error('A reason is required when marking a lead as lost')
  await prisma.$transaction(async (tx) => {
    const before = await tx.lead.findUniqueOrThrow({ where: { id: leadId }, select: { status: true } })
    if (before.status === status) return
    await tx.lead.update({
      where: { id: leadId },
      data: {
        status,
        lostReason: status === 'LOST' ? extras.lostReason!.trim() : null,
        ...(extras.dealValue !== undefined ? { dealValue: extras.dealValue } : {}),
      },
    })
    await logActivity(
      { entityType: 'LEAD', entityId: leadId, action: 'lead.status_changed', actorId, metadata: { from: before.status, to: status, ...extras } },
      tx,
    )
  })
}

/** Apply an assignee and/or status change to many leads in one transaction (all or nothing, set-based queries). */
export async function bulkUpdateLeadsTx(
  ids: string[],
  change: { assigneeId?: string | null; status?: LeadStatus },
  actorId: string,
): Promise<void> {
  if (change.status === 'LOST') throw new Error('A reason is required when marking a lead as lost')
  await prisma.$transaction(async (tx) => {
    const before = await tx.lead.findMany({ where: { id: { in: ids } }, select: { id: true, status: true, assignedToId: true } })
    if (before.length !== ids.length) throw new Error('Some leads no longer exist')
    if (change.assigneeId) {
      const user = await tx.user.findUnique({ where: { id: change.assigneeId }, select: { role: true } })
      if (!user || (user.role !== 'SALES' && user.role !== 'ADMIN')) throw new Error('Assignee must be a SALES or ADMIN user')
    }
    const logs: Prisma.ActivityLogCreateManyInput[] = []
    if (change.assigneeId !== undefined) {
      await tx.lead.updateMany({ where: { id: { in: ids } }, data: { assignedToId: change.assigneeId } })
      for (const l of before)
        logs.push({ entityType: 'LEAD', entityId: l.id, action: 'lead.assigned', actorId, metadata: { from: l.assignedToId, to: change.assigneeId, strategy: 'bulk' } })
    }
    if (change.status) {
      const changing = before.filter((l) => l.status !== change.status)
      if (changing.length) {
        await tx.lead.updateMany({ where: { id: { in: changing.map((l) => l.id) } }, data: { status: change.status, lostReason: null } })
        for (const l of changing)
          logs.push({ entityType: 'LEAD', entityId: l.id, action: 'lead.status_changed', actorId, metadata: { from: l.status, to: change.status } })
      }
    }
    if (logs.length) await tx.activityLog.createMany({ data: logs })
  })
}

/** Move every open lead and future booking from one user to another (or unassign leads when toId is null). */
export async function reassignUserWork(fromId: string, toId: string | null, actorId: string, tx: Prisma.TransactionClient): Promise<number> {
  const leads = await tx.lead.findMany({ where: { assignedToId: fromId }, select: { id: true } })
  if (leads.length === 0) return 0
  await tx.lead.updateMany({ where: { assignedToId: fromId }, data: { assignedToId: toId } })
  await tx.activityLog.createMany({
    data: leads.map((l) => ({
      entityType: 'LEAD' as const,
      entityId: l.id,
      action: 'lead.assigned',
      actorId,
      metadata: { from: fromId, to: toId, strategy: 'reassign-on-deactivate' },
    })),
  })
  return leads.length
}

/** Best-effort team alert for a brand-new inbound lead (Settings → Notifications). Never throws. */
export async function notifyTeamOfNewLead(leadId: string): Promise<void> {
  try {
    const [enabled, to] = await Promise.all([getSetting('notifications.newLead'), getSetting('notifications.emails')])
    if (!enabled || to.length === 0) return
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { assignedTo: { select: { name: true, email: true } } } })
    if (!lead) return
    await sendNewLeadAlertEmail(to, {
      leadName: [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.email || lead.phone || 'New lead',
      leadEmail: lead.email,
      phone: lead.phone,
      company: lead.company,
      budget: lead.budget,
      source: lead.sourceDetail ? `${lead.source} · ${lead.sourceDetail}` : lead.source,
      campaign: lead.utmCampaign,
      message: lead.message,
      owner: lead.assignedTo ? (lead.assignedTo.name ?? lead.assignedTo.email) : null,
      leadUrl: appUrl(`/sales/leads/${lead.id}`),
    })
  } catch (err) {
    console.error('[leads] new-lead alert failed', leadId, err)
  }
}
