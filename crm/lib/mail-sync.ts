import 'server-only'
import type { gmail_v1 } from '@googleapis/gmail'
import { logActivity } from './audit'
import { GmailNotConnectedError, gmailForUser, hasGmailAccess } from './google'
import { extractBody, header, parseAddressList, stripQuoted } from './mail-parse'
import { prisma } from './prisma'

/** The part of the Gmail API the sync uses (lets tests pass a fake). */
export interface MailApi {
  list(q: string, pageToken?: string): Promise<{ ids: string[]; nextPageToken?: string | null }>
  get(id: string, format: 'metadata' | 'full'): Promise<gmail_v1.Schema$Message>
}

export function gmailApi(g: gmail_v1.Gmail): MailApi {
  return {
    async list(q, pageToken) {
      const r = await g.users.messages.list({ userId: 'me', q, maxResults: 100, pageToken })
      return { ids: (r.data.messages ?? []).flatMap((m) => (m.id ? [m.id] : [])), nextPageToken: r.data.nextPageToken }
    },
    async get(id, format) {
      const r = await g.users.messages.get({ userId: 'me', id, format, ...(format === 'metadata' ? { metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date', 'Message-ID'] } : {}) })
      return r.data
    },
  }
}

const FIRST_SYNC_DAYS = 30
const MAX_PER_RUN = 300

export interface SyncResult {
  scanned: number
  stored: number
  inbound: number
  skipped?: string
}

/**
 * Pull new emails from one teammate's Gmail and file the ones exchanged with known contacts under those contacts.
 * Everything else in the mailbox is ignored (never stored). Safe to run repeatedly: rows are de-duplicated per contact.
 */
export async function syncMailbox(userId: string, opts: { api?: MailApi; now?: Date } = {}): Promise<SyncResult> {
  const now = opts.now ?? new Date()
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } })
  if (!user?.email || !user.role) return { scanned: 0, stored: 0, inbound: 0, skipped: 'no access' }
  let api = opts.api
  if (!api) {
    if (!(await hasGmailAccess(userId))) return { scanned: 0, stored: 0, inbound: 0, skipped: 'gmail not connected' }
    api = gmailApi(await gmailForUser(userId))
  }
  const owner = user.email.toLowerCase()
  const state = await prisma.mailboxSync.findUnique({ where: { userId } })
  const since = state?.lastSyncedAt ?? new Date(now.getTime() - FIRST_SYNC_DAYS * 864e5)
  // One hour of overlap so nothing slips between runs (rows are de-duplicated anyway).
  const q = `after:${Math.floor((since.getTime() - 3600_000) / 1000)} -in:chats -in:drafts`

  // Known contact addresses → lead ids.
  const leads = await prisma.lead.findMany({ where: { email: { not: null } }, select: { id: true, email: true } })
  const byEmail = new Map<string, string>()
  for (const l of leads) byEmail.set(l.email!.toLowerCase(), l.id)

  let scanned = 0
  let stored = 0
  let inbound = 0
  try {
    let pageToken: string | undefined
    do {
      const page = await api.list(q, pageToken)
      for (const id of page.ids) {
        if (scanned >= MAX_PER_RUN) break
        scanned++
        const meta = await api.get(id, 'metadata')
        if (meta.labelIds?.includes('DRAFT') || meta.labelIds?.includes('SPAM') || meta.labelIds?.includes('TRASH')) continue
        const h = meta.payload?.headers
        const from = parseAddressList(header(h, 'From'))[0]
        if (!from) continue
        const to = parseAddressList(header(h, 'To'))
        const cc = parseAddressList(header(h, 'Cc'))
        const outbound = from.email === owner
        const people = [from, ...to, ...cc].map((a) => a.email).filter((e) => e !== owner)
        const leadIds = [...new Set(people.flatMap((e) => (byEmail.has(e) ? [byEmail.get(e)!] : [])))]
        if (leadIds.length === 0) continue

        const messageIdHeader = header(h, 'Message-ID')?.trim() || null
        const dedupeKey = messageIdHeader ?? `gmail:${id}`
        const already = await prisma.emailMessage.findMany({ where: { leadId: { in: leadIds }, dedupeKey }, select: { leadId: true } })
        const fresh = leadIds.filter((l) => !already.some((a) => a.leadId === l))
        if (fresh.length === 0) continue

        const full = await api.get(id, 'full')
        const body = extractBody(full.payload)
        const clean = stripQuoted(body) || body
        const subject = header(h, 'Subject')?.trim() || '(no subject)'
        const sentAt = meta.internalDate ? new Date(Number(meta.internalDate)) : new Date(header(h, 'Date') ?? now)
        for (const leadId of fresh) {
          const created = await prisma.$transaction(async (tx) => {
            const row = await tx.emailMessage
              .create({
                data: {
                  leadId,
                  mailboxUserId: userId,
                  externalId: `gmail:${id}`,
                  messageIdHeader,
                  dedupeKey,
                  threadId: meta.threadId ?? null,
                  direction: outbound ? 'OUTBOUND' : 'INBOUND',
                  fromEmail: from.email,
                  fromName: from.name,
                  toEmails: to.map((a) => a.email),
                  ccEmails: cc.map((a) => a.email),
                  subject: subject.slice(0, 500),
                  snippet: (clean || meta.snippet || '').replace(/\s+/g, ' ').slice(0, 200),
                  bodyText: clean.slice(0, 20000),
                  sentAt,
                },
              })
              .catch((err: unknown) => {
                // Another mailbox stored the same email at the same moment.
                if ((err as { code?: string }).code === 'P2002') return null
                throw err
              })
            if (!row) return false
            await logActivity(
              {
                entityType: 'LEAD',
                entityId: leadId,
                // An email the teammate sent counts as a touch; a client's email is shown but doesn't reset the follow-up clock.
                actorId: outbound ? userId : null,
                action: outbound ? 'email.sent' : 'email.received',
                metadata: { subject: row.subject, body: clean.slice(0, 2000), from: from.email, via: 'gmail', emailId: row.id },
              },
              tx,
            )
            return true
          })
          if (created) {
            stored++
            if (!outbound) inbound++
          }
        }
      }
      pageToken = scanned < MAX_PER_RUN ? (page.nextPageToken ?? undefined) : undefined
    } while (pageToken)
    await prisma.mailboxSync.upsert({ where: { userId }, create: { userId, lastSyncedAt: now, lastError: null }, update: { lastSyncedAt: now, lastError: null } })
  } catch (err) {
    const msg = err instanceof GmailNotConnectedError ? 'gmail not connected' : err instanceof Error ? err.message : String(err)
    await prisma.mailboxSync.upsert({ where: { userId }, create: { userId, lastError: msg.slice(0, 500) }, update: { lastError: msg.slice(0, 500) } })
    throw err
  }
  return { scanned, stored, inbound }
}

/** Sync every teammate who has connected Gmail (used by the hourly cron). Errors per mailbox are recorded, not thrown. */
export async function syncAllMailboxes(): Promise<{ mailboxes: number; stored: number; failed: number }> {
  const accounts = await prisma.account.findMany({ where: { provider: 'google', refresh_token: { not: null }, scope: { contains: 'gmail.readonly' } }, select: { userId: true } })
  let stored = 0
  let failed = 0
  for (const { userId } of accounts) {
    try {
      stored += (await syncMailbox(userId)).stored
    } catch (err) {
      failed++
      console.error('[mail-sync] mailbox failed', userId, err)
    }
  }
  return { mailboxes: accounts.length, stored, failed }
}
