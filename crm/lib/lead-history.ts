import { prisma } from './prisma'
import { readProfile } from './lead-intel'

/**
 * Everything that happened with one contact, across every channel (emails, texts, calls with their AI review,
 * meetings, notes), as one timeline. "Brief me" and the follow-up assistant both read it. Server only.
 */

export type HistoryKind = 'email' | 'sms' | 'call' | 'meeting' | 'note'

export interface HistoryItem {
  at: Date
  kind: HistoryKind
  /** in = the client reached us; out = we reached them; both = a real conversation (an answered call, a meeting); null = internal or no contact */
  dir: 'in' | 'out' | 'both' | null
  /** one compact line (or a few) for the AI */
  text: string
  /** commitments found in a call or meeting that are still open */
  open?: string[]
}

export interface LeadHistory {
  lead: { id: string; name: string; email: string | null; phone: string | null; company: string | null; status: string; ownerId: string | null; budget: string | null }
  items: HistoryItem[]
  /** the newest message or answered call from the client, and from us */
  lastIn: Date | null
  lastOut: Date | null
  /** promises from the calls that nobody has ticked off */
  openItems: { text: string; owner: 'rep' | 'client'; at: Date }[]
}

const clip = (s: string | null | undefined, n: number): string => {
  const t = (s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
}

export const leadDisplayName = (l: { firstName: string | null; lastName: string | null; company: string | null; email: string | null; phone: string | null }): string => [l.firstName, l.lastName].filter(Boolean).join(' ') || l.company || l.email || l.phone || 'this contact'

type Analysis = { summary?: string; nextStep?: string | null; objections?: { objection: string }[]; actionItems?: { owner: 'rep' | 'client'; text: string }[]; outcome?: { label?: string } }

/** The contact's history, newest last. `limit` keeps the newest items of each kind. */
export async function loadLeadHistory(leadId: string, limit = 25): Promise<LeadHistory> {
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: leadId },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true, status: true, assignedToId: true, budget: true, message: true, createdAt: true, profile: true },
  })
  const [emails, texts, calls, notes, meetings] = await Promise.all([
    prisma.emailMessage.findMany({ where: { leadId }, orderBy: { sentAt: 'desc' }, take: limit, select: { sentAt: true, direction: true, subject: true, bodyText: true, fromName: true } }),
    prisma.smsMessage.findMany({ where: { leadId }, orderBy: { createdAt: 'desc' }, take: limit, select: { createdAt: true, direction: true, body: true, status: true } }),
    prisma.call.findMany({ where: { leadId, simulated: false }, orderBy: { startedAt: 'desc' }, take: limit, select: { startedAt: true, direction: true, durationSec: true, outcome: true, notes: true, analysis: true } }),
    prisma.leadNote.findMany({ where: { leadId }, orderBy: { createdAt: 'desc' }, take: limit, select: { createdAt: true, body: true } }),
    prisma.booking.findMany({
      where: { leadId, status: { not: 'CANCELLED' } },
      orderBy: { startTime: 'desc' },
      take: 10,
      select: { startTime: true, title: true, status: true, meeting: { select: { summaryText: true, nextStepsText: true } } },
    }),
  ])

  const items: HistoryItem[] = []
  if (lead.message) items.push({ at: lead.createdAt, kind: 'note', dir: 'in', text: `Their first message (form): ${clip(lead.message, 400)}` })
  for (const e of emails) items.push({ at: e.sentAt, kind: 'email', dir: e.direction === 'INBOUND' ? 'in' : 'out', text: `Subject "${clip(e.subject, 120)}": ${clip(e.bodyText, 700)}` })
  for (const s of texts) {
    if (s.direction === 'OUTBOUND' && (s.status === 'failed' || s.status === 'undelivered')) continue
    items.push({ at: s.createdAt, kind: 'sms', dir: s.direction === 'INBOUND' ? 'in' : 'out', text: clip(s.body, 500) })
  }
  for (const c of calls) {
    const a = (c.analysis ?? null) as Analysis | null
    const talked = (c.durationSec ?? 0) > 0
    const parts = [
      `${c.direction === 'INBOUND' ? 'They called' : 'We called'}${talked ? ` (${Math.max(1, Math.round((c.durationSec ?? 0) / 60))} min)` : ''}${c.outcome ? `, outcome: ${c.outcome.replace(/_/g, ' ')}` : ''}.`,
      a?.summary ? `Summary: ${clip(a.summary, 700)}` : '',
      a?.objections?.length ? `Objections: ${a.objections.map((o) => clip(o.objection, 120)).join('; ')}` : '',
      a?.nextStep ? `Agreed next step: ${clip(a.nextStep, 200)}` : '',
      c.notes ? `Rep's notes: ${clip(c.notes, 300)}` : '',
    ].filter(Boolean)
    // only a call where both sides talked counts as contact (and it counts both ways)
    items.push({ at: c.startedAt, kind: 'call', dir: talked ? 'both' : null, text: parts.join(' ') })
  }
  for (const n of notes) items.push({ at: n.createdAt, kind: 'note', dir: null, text: `Internal note: ${clip(n.body, 500)}` })
  for (const b of meetings) {
    const m = b.meeting
    const text = [`Meeting "${clip(b.title, 100)}" (${b.status.toLowerCase()})`, m?.summaryText ? `Summary: ${clip(m.summaryText, 600)}` : '', m?.nextStepsText ? `Next steps: ${clip(m.nextStepsText, 300)}` : ''].filter(Boolean).join('. ')
    items.push({ at: b.startTime, kind: 'meeting', dir: b.startTime.getTime() < Date.now() && b.status === 'CONFIRMED' ? 'both' : null, text })
  }
  items.sort((a, b) => a.at.getTime() - b.at.getTime())

  const last = (dir: 'in' | 'out'): Date | null => {
    const it = [...items].reverse().find((i) => (i.dir === dir || i.dir === 'both') && i.at.getTime() <= Date.now())
    return it?.at ?? null
  }
  const profile = readProfile(lead.profile)
  const openItems = (profile?.actionItems ?? []).filter((i) => i.status === 'open' || i.status === 'tasked').map((i) => ({ text: i.text, owner: i.owner, at: new Date(i.at) }))

  return {
    lead: { id: lead.id, name: leadDisplayName(lead), email: lead.email, phone: lead.phone, company: lead.company, status: lead.status, ownerId: lead.assignedToId, budget: lead.budget },
    items,
    lastIn: last('in'),
    lastOut: last('out'),
    openItems,
  }
}

/** The kind (email, sms, call…) of the newest item that went this way. */
export function lastKind(h: LeadHistory, dir: 'in' | 'out'): HistoryKind | null {
  return [...h.items].reverse().find((i) => (i.dir === dir || i.dir === 'both') && i.at.getTime() <= Date.now())?.kind ?? null
}

/** The timeline as plain text for a prompt: one line per item, dated, newest last, capped to `maxChars`. */
export function historyText(h: LeadHistory, timeZone = 'Asia/Jerusalem', maxChars = 14_000): string {
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone, day: 'numeric', month: 'short', year: 'numeric' })
  const who = (i: HistoryItem): string => (i.dir === 'in' ? 'CLIENT→US' : i.dir === 'out' ? 'US→CLIENT' : i.dir === 'both' ? 'CONVERSATION' : 'NO CONTACT / INTERNAL')
  const lines = h.items.map((i) => `[${fmt.format(i.at)}] ${i.kind.toUpperCase()} ${who(i)}: ${i.text}`)
  // keep the newest lines when it's too long
  const out: string[] = []
  let size = 0
  for (const l of [...lines].reverse()) {
    if (size + l.length > maxChars) break
    out.unshift(l)
    size += l.length + 1
  }
  if (out.length < lines.length) out.unshift(`(${lines.length - out.length} older items left out)`)
  return out.join('\n')
}
