import 'server-only'
import { z } from 'zod'
import { chat, reviewModelName } from './call-analysis'
import { coachingLanguage } from './call-language'
import { followUpReason, pickChannel, type FollowUpKind } from './follow-up-rules'
import { historyText, lastKind, loadLeadHistory } from './lead-history'
import { prisma } from './prisma'
import { getSetting } from './settings'
import { createAutoTask, loadTasks } from './tasks'

/**
 * The follow-up assistant. Each hour it looks at contacts that had a real conversation in the last 45 days, finds the
 * ones that went quiet while something was still open (follow-up-rules.ts), and drafts the follow-up in the owner's
 * own style. The draft waits on their Today page with a task; nothing is ever sent without them.
 */

const Draft = z.object({
  subject: z
    .string()
    .nullable()
    .transform((s) => (s?.trim() ? s.trim().slice(0, 150) : null)),
  body: z.string().transform((s) => s.trim().slice(0, 3000)),
})

const SCHEMA = { type: 'object', additionalProperties: false, required: ['subject', 'body'], properties: { subject: { type: ['string', 'null'] }, body: { type: 'string' } } }

const PROMPT = `You draft one follow-up message that a salesperson will review and send to a client. The conversation went
quiet while something was still open. You get the history (oldest first), why a follow-up is due, the channel, and
examples of how this salesperson writes. Write it the way they write: same greeting style, length, warmth and language
habits (Hebrew, English or both as they do with this client). Rules:
- Pick up exactly where things stopped and move it one step forward (send what was promised, answer the open question,
  propose a specific time). One clear ask.
- Short: an email of 3 to 6 sentences; a text message of 1 to 3 sentences. Subject only for email (short, specific), else null.
- Never invent prices, dates, links, attachments or facts that aren't in the history. If something promised isn't
  in the history (like a quote), write that you're sending it or ask when suits them; never pretend it's attached.
- Sign off with the salesperson's first name if they usually do. No markdown, no em dashes, no placeholders like [Name].`

/** How this salesperson writes: their last few messages to clients (any client), clipped. */
async function styleSamples(userId: string): Promise<string> {
  const [emails, texts] = await Promise.all([
    prisma.emailMessage.findMany({ where: { mailboxUserId: userId, direction: 'OUTBOUND' }, orderBy: { sentAt: 'desc' }, take: 4, select: { bodyText: true } }),
    prisma.smsMessage.findMany({ where: { userId, direction: 'OUTBOUND' }, orderBy: { createdAt: 'desc' }, take: 4, select: { body: true } }),
  ])
  const all = [...emails.map((e) => `EMAIL: ${e.bodyText}`), ...texts.map((t) => `TEXT: ${t.body}`)].map((s) => s.replace(/\s+/g, ' ').trim().slice(0, 500)).filter((s) => s.length > 15)
  return all.length ? all.join('\n---\n') : '(no examples yet: write in a friendly, direct, professional tone)'
}

/** Draft a follow-up for one contact right now, if one is due. Returns the draft id, or null when nothing is due. */
export async function draftFollowUp(leadId: string, now = new Date()): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  const h = await loadLeadHistory(leadId, 30)
  const ownerId = h.lead.ownerId
  if (!ownerId) return null
  const reason = followUpReason({ status: h.lead.status, lastIn: h.lastIn, lastOut: h.lastOut, openItems: h.openItems, lastInKind: lastKind(h, 'in') }, now)
  if (!reason) return null
  const channel = pickChannel({ email: h.lead.email, phone: h.lead.phone, lastInKind: lastKind(h, 'in'), lastOutKind: lastKind(h, 'out') })
  if (!channel) return null
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { name: true, timeZone: true } })
  const tz = owner?.timeZone || 'Asia/Jerusalem'
  const text = historyText(h, tz, 10_000)
  const lang = coachingLanguage(text)
  const raw = await chat(
    key,
    PROMPT,
    [
      `Salesperson: ${owner?.name ?? 'the rep'}. Client: ${h.lead.name}${h.lead.company ? ` (${h.lead.company})` : ''}.`,
      `Why now: ${reason.text}`,
      `Channel: ${channel === 'email' ? 'email' : 'text message (SMS)'}. The conversation is mostly in ${lang === 'he' ? 'Hebrew' : 'English'}.`,
      `How the salesperson writes:\n${await styleSamples(ownerId)}`,
      `History:\n${text}`,
    ].join('\n\n'),
    'follow_up',
    SCHEMA,
    'low',
    await reviewModelName(),
    'follow-up',
  )
  const draft = Draft.parse(raw)
  if (!draft.body) return null
  return prisma.$transaction(async (tx) => {
    const taskId = await createAutoTask({ leadId, title: `Follow up with ${h.lead.name}: draft ready`, dueAt: now, assigneeId: ownerId, priority: reason.kind === 'unanswered' ? 'HIGH' : 'MEDIUM', auto: 'follow-up-draft' }, tx)
    const row = await tx.followUpDraft.create({ data: { leadId, userId: ownerId, taskId, channel, subject: channel === 'email' ? (draft.subject ?? 'Following up') : null, body: draft.body, reason: reason.text, kind: reason.kind } })
    return row.id
  })
}

/** Contacts worth a look: a real conversation in the last 45 days, an owner, still open, no draft in the last 5 days. */
async function candidates(now: Date, max: number): Promise<string[]> {
  const since = new Date(now.getTime() - 45 * 86_400_000)
  const [e, s, c] = await Promise.all([
    prisma.emailMessage.findMany({ where: { sentAt: { gte: since } }, select: { leadId: true }, distinct: ['leadId'] }),
    prisma.smsMessage.findMany({ where: { createdAt: { gte: since }, leadId: { not: null } }, select: { leadId: true }, distinct: ['leadId'] }),
    prisma.call.findMany({ where: { startedAt: { gte: since }, leadId: { not: null }, durationSec: { gt: 0 }, simulated: false }, select: { leadId: true }, distinct: ['leadId'] }),
  ])
  const ids = [...new Set([...e.map((x) => x.leadId), ...s.map((x) => x.leadId), ...c.map((x) => x.leadId)].filter((x): x is string => Boolean(x)))]
  if (!ids.length) return []
  const recent = new Set((await prisma.followUpDraft.findMany({ where: { leadId: { in: ids }, OR: [{ status: 'open' }, { createdAt: { gte: new Date(now.getTime() - 5 * 86_400_000) } }] }, select: { leadId: true } })).map((d) => d.leadId))
  const open = await prisma.lead.findMany({
    where: { id: { in: ids.filter((id) => !recent.has(id)) }, assignedToId: { not: null }, status: { notIn: ['WON', 'LOST', 'NOT_INTERESTED', 'WRONG_NUMBER'] } },
    select: { id: true },
    orderBy: { updatedAt: 'desc' },
  })
  // an open "no reply yet" reminder already covers a quiet email thread; the assistant skips those contacts
  const tasks = await loadTasks(open.map((l) => l.id))
  const reminded = new Set(tasks.filter((t) => !t.done && (t.auto === 'email-reply' || t.auto === 'follow-up-draft')).map((t) => t.leadId))
  return open
    .map((l) => l.id)
    .filter((id) => !reminded.has(id))
    .slice(0, max)
}

/** The hourly run: look at up to `look` contacts and write at most `limit` drafts. */
export async function runFollowUpAssistant(opts: { look?: number; limit?: number } = {}): Promise<{ looked: number; drafted: number }> {
  if (!process.env.OPENAI_API_KEY || !(await getSetting('followUps.enabled'))) return { looked: 0, drafted: 0 }
  const now = new Date()
  const ids = await candidates(now, opts.look ?? 60)
  let drafted = 0
  for (const id of ids) {
    if (drafted >= (opts.limit ?? 8)) break
    try {
      if (await draftFollowUp(id, now)) drafted++
    } catch (err) {
      console.error('[follow-ups] draft failed', id, err instanceof Error ? err.message : err)
    }
  }
  return { looked: ids.length, drafted }
}

export type { FollowUpKind }
