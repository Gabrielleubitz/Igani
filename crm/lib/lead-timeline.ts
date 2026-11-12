import { formatMoney, formatDateTime, statusLabel } from '@/lib/format'
import { formatPrice } from '@/lib/offer-modules'
import { formatPhone } from '@/lib/phone-numbers'

/** What the lead page's Activities tab shows: one typed card per thing that happened (or is coming up). Pure, no database. */
export type TimelineKind = 'note' | 'email' | 'sms' | 'call' | 'task' | 'meeting' | 'lead' | 'document' | 'offer'
export type TimelineGroup = 'overdue' | 'upcoming' | 'past'

export interface TimelineItem {
  id: string
  kind: TimelineKind
  title: string
  body?: string
  /** ISO time (when it happened, or when it's due / starts) */
  at: string
  actor: string
  /** in = they reached us, out = we reached them */
  dir?: 'in' | 'out'
  group: TimelineGroup
}

export interface LogLike {
  id: string
  action: string
  metadata: unknown
  createdAt: Date
  actor: { name: string | null; email: string | null } | null
}

export interface DescribeCtx {
  isAdmin: boolean
  tz: string
  nameOf: Map<string, string>
  /** task id → title (for "Task done: …") */
  titles: Map<string, string>
}

const TOUCH: Record<string, string> = { call: 'Call', email: 'Email', meeting: 'Meeting', whatsapp: 'WhatsApp' }
export const HIDDEN_ACTIONS = new Set(['task.reminded'])

export function kindOfAction(action: string, meta: Record<string, unknown> = {}): TimelineKind {
  if (action === 'note.added') return 'note'
  if (action === 'touch.logged') return meta.kind === 'call' ? 'call' : meta.kind === 'email' ? 'email' : meta.kind === 'meeting' ? 'meeting' : 'sms'
  const head = action.split('.')[0]
  if (head === 'email') return 'email'
  if (head === 'sms') return 'sms'
  if (head === 'call') return 'call'
  if (head === 'meeting') return 'meeting'
  if (head === 'task') return 'task'
  if (head === 'document') return 'document'
  if (head === 'offer') return 'offer'
  return 'lead'
}

function dirOf(action: string, meta: Record<string, unknown>): 'in' | 'out' | undefined {
  if (action === 'email.received' || action === 'sms.received') return 'in'
  if (action === 'email.sent' || action === 'sms.sent' || action === 'touch.logged') return 'out'
  if (action === 'call.ended') return meta.direction === 'INBOUND' ? 'in' : 'out'
  return undefined
}

const cut = (t: string, n: number): string => (t.length > n ? t.slice(0, n) + '…' : t)

/** The title and text of one activity entry (the same wording the page has always used). */
export function describeActivity(l: LogLike, ctx: DescribeCtx): { title: string; body?: string } {
  const { isAdmin, tz, nameOf, titles } = ctx
  const m = (l.metadata ?? {}) as Record<string, unknown>
  const s = (v: unknown): string => (v == null ? '' : String(v))
  switch (l.action) {
    case 'note.added':
      return { title: 'Note', body: s(m.body) }
    case 'touch.logged':
      return { title: `${TOUCH[s(m.kind)] ?? 'Touch'} logged`, body: s(m.summary) || undefined }
    case 'email.sent':
      return { title: `${m.via === 'gmail' ? 'Emailed from Gmail' : 'Email sent'}: ${s(m.subject)}${m.followUpDays ? ` · reminder in ${s(m.followUpDays)} days if no reply` : ''}`, body: s(m.body) ? cut(s(m.body), 280) : undefined }
    case 'email.received':
      return { title: `Email from ${s(m.from)}: ${s(m.subject)}`, body: s(m.body) ? cut(s(m.body), 280) : undefined }
    case 'lead.status_changed':
      return {
        title: `Stage: ${statusLabel(s(m.from))} → ${statusLabel(s(m.to))}`,
        body: [m.lostReason ? `Reason: ${s(m.lostReason)}` : '', isAdmin && (m.quotedPrice ?? m.dealValue) != null ? `Quoted price: ₪${formatMoney(Number(m.quotedPrice ?? m.dealValue))}` : '', m.bookingId ? 'Meeting booked' : ''].filter(Boolean).join(' · ') || undefined,
      }
    case 'lead.assigned': {
      const to = m.to ?? m.assignedToId
      const who = (id: unknown): string => (id ? (nameOf.get(String(id)) ?? 'former teammate') : 'nobody')
      const how = m.strategy === 'round-robin' ? ' (auto, round-robin)' : m.strategy === 'reassign-on-deactivate' ? ' (owner left the team)' : ''
      return { title: 'from' in m ? `Owner: ${who(m.from)} → ${who(to)}${how}` : `Assigned to ${who(to)}${how}` }
    }
    case 'lead.created':
      return { title: `Lead created${m.source ? ` · source ${s(m.source)}` : ''}` }
    case 'lead.resubmitted':
      return { title: `Contacted us again${m.source ? ` via ${s(m.source)}` : ''}`, body: s(m.message) || undefined }
    case 'lead.edited':
      return { title: `Details edited${Array.isArray(m.fields) && m.fields.length ? `: ${(m.fields as string[]).join(', ')}` : ''}` }
    case 'lead.archived':
      return { title: 'Archived' }
    case 'lead.restored':
      return { title: 'Restored from archive' }
    case 'lead.assignment_skipped':
      return { title: 'Auto-assign skipped: no active sales reps' }
    case 'meeting.started':
      return { title: `Call started: ${s(m.title)}`, body: m.at ? formatDateTime(new Date(s(m.at)), tz) : undefined }
    case 'meeting.ended':
      return { title: `Call ended: ${s(m.title)}${m.minutes != null ? ` · ${s(m.minutes)} min` : ''}`, body: Array.isArray(m.people) && m.people.length ? `Joined: ${(m.people as string[]).join(', ')}` : undefined }
    case 'meeting.not_held':
      return { title: `Nobody joined the call: ${s(m.title)}` }
    case 'meeting.notes':
      return { title: `Gemini notes: ${s(m.title)}`, body: s(m.summary) ? cut(s(m.summary), 400) : 'Notes doc linked under Meetings' }
    case 'meeting.cancelled':
      return { title: `Meeting cancelled: ${s(m.title)}`, body: m.start ? formatDateTime(new Date(s(m.start)), tz) : undefined }
    case 'call.ended': {
      const secs = Number(m.durationSec ?? 0)
      const talk = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
      const how = m.answered ? `talked ${talk}` : ({ BUSY: 'busy', NO_ANSWER: 'no answer', FAILED: 'didn’t go through', CANCELED: 'hung up before they answered' } as Record<string, string>)[s(m.status)] ?? 'not answered'
      return { title: `${m.direction === 'INBOUND' ? 'Call from' : 'Called'} ${formatPhone(s(m.direction === 'INBOUND' ? m.from : m.to))} · ${how}` }
    }
    case 'sms.sent':
      return { title: `Text to ${formatPhone(s(m.to))}`, body: s(m.body) || undefined }
    case 'sms.received':
      return { title: `Text from ${formatPhone(s(m.from))}`, body: s(m.body) || (m.media ? 'Picture or file (open it in Twilio)' : undefined) }
    case 'call.analyzed':
      return { title: `Call summary${m.outcome ? `: ${s(m.outcome)}` : ''}`, body: [s(m.summary), m.nextStep ? `Next step: ${s(m.nextStep)}` : ''].filter(Boolean).join('\n') || undefined }
    case 'call.outcome':
      return { title: `Call outcome: ${({ interested: 'Interested', connected: 'Connected', voicemail: 'Left voicemail', no_answer: 'No answer', busy: 'Busy', callback: 'Call back later', not_interested: 'Not interested', wrong_number: 'Wrong number' } as Record<string, string>)[s(m.outcome)] ?? s(m.outcome)}`, body: s(m.notes) || undefined }
    case 'task.created':
      return { title: `Task added: ${s(m.title)}`, body: m.auto === 'invoice' ? 'Created when the client signed the offer' : m.auto ? 'Created automatically around a meeting' : undefined }
    case 'task.completed':
      return { title: `Task done: ${titles.get(s(m.taskId)) ?? 'task'}` }
    case 'task.reopened':
      return { title: `Task reopened: ${titles.get(s(m.taskId)) ?? 'task'}` }
    case 'task.updated':
      return { title: `Task edited: ${titles.get(s(m.taskId)) ?? 'task'}` }
    case 'task.deleted':
      return { title: `Task deleted: ${titles.get(s(m.taskId)) ?? 'task'}` }
    case 'offer.created':
      return { title: `Offer created: ${s(m.title)}` }
    case 'offer.live':
      return { title: 'Offer published to the client' }
    case 'offer.draft':
      return { title: 'Offer taken back to draft' }
    case 'offer.archived':
      return { title: 'Offer archived' }
    case 'offer.deleted':
      return { title: 'Draft offer deleted' }
    case 'offer.signed':
      return { title: `Offer signed online by ${s(m.signerName)}`, body: isAdmin && m.total != null ? `One-time total ${formatPrice(Number(m.total), s(m.currency) || 'ILS')} · signed PDF in Documents` : 'Signed PDF in Documents' }
    case 'document.added':
      return { title: `Document added: ${s(m.title)}` }
    case 'document.removed':
      return { title: `Document removed: ${s(m.title)}` }
    case 'lead.price_changed':
      return { title: `Quoted price: ${m.from != null ? `₪${formatMoney(Number(m.from))}` : 'none'} → ${m.to != null ? `₪${formatMoney(Number(m.to))}` : 'none'}` }
    case 'lead.commission_payment':
      return { title: `${s(m.kind) === 'received' ? 'Client payment received' : 'Commission paid out'}${m.date ? ` (${s(m.date)})` : ' (undone)'}` }
    default:
      return { title: l.action.replace(/[._]/g, ' ') }
  }
}

export interface OpenTaskLike {
  id: string
  title: string
  dueAt: Date | null
  done: boolean
}
export interface BookingLike {
  id: string
  title: string
  startTime: Date
  endTime: Date
  status: string
  hostName: string | null
}

/**
 * Everything on the lead, newest first: the activity log, plus what is still ahead (open tasks, future meetings) so the
 * Activities tab can show Overdue and Upcoming. Done and past things only appear through the log.
 */
export function buildTimeline(input: { logs: LogLike[]; tasks: OpenTaskLike[]; bookings: BookingLike[]; now: Date; ctx: DescribeCtx; me: string }): TimelineItem[] {
  const { logs, tasks, bookings, now, ctx } = input
  const items: TimelineItem[] = []
  for (const l of logs) {
    if (HIDDEN_ACTIONS.has(l.action)) continue
    const m = (l.metadata ?? {}) as Record<string, unknown>
    const d = describeActivity(l, ctx)
    items.push({
      id: l.id,
      kind: kindOfAction(l.action, m),
      title: d.title,
      ...(d.body ? { body: d.body } : {}),
      at: l.createdAt.toISOString(),
      actor: l.actor ? (l.actor.name ?? l.actor.email ?? 'Teammate') : 'System',
      ...(dirOf(l.action, m) ? { dir: dirOf(l.action, m)! } : {}),
      group: 'past',
    })
  }
  for (const t of tasks) {
    if (t.done) continue
    const due = t.dueAt
    items.push({
      id: `task:${t.id}`,
      kind: 'task',
      title: t.title,
      at: (due ?? now).toISOString(),
      actor: '',
      group: due && due.getTime() < now.getTime() ? 'overdue' : 'upcoming',
      ...(due ? { body: `Due ${formatDateTime(due, ctx.tz)}` } : { body: 'No due date' }),
    })
  }
  for (const b of bookings) {
    if (b.status === 'CANCELLED' || b.endTime.getTime() < now.getTime()) continue
    items.push({ id: `booking:${b.id}`, kind: 'meeting', title: `Meeting: ${b.title}`, body: b.hostName ? `With ${b.hostName}` : undefined, at: b.startTime.toISOString(), actor: b.hostName ?? '', group: 'upcoming' })
  }
  return items.sort((a, b) => b.at.localeCompare(a.at))
}

export interface TimelineSection {
  key: string
  label: string
  items: TimelineItem[]
}

/** Overdue (most overdue first), Upcoming (soonest first), then one section per month, newest month first. */
export function groupTimeline(items: TimelineItem[], tz: string): TimelineSection[] {
  const overdue = items.filter((i) => i.group === 'overdue').sort((a, b) => a.at.localeCompare(b.at))
  const upcoming = items.filter((i) => i.group === 'upcoming').sort((a, b) => a.at.localeCompare(b.at))
  const out: TimelineSection[] = []
  if (overdue.length) out.push({ key: 'overdue', label: 'Overdue', items: overdue })
  if (upcoming.length) out.push({ key: 'upcoming', label: 'Upcoming', items: upcoming })
  const month = new Intl.DateTimeFormat('en-GB', { timeZone: tz, month: 'long', year: 'numeric' })
  const byMonth = new Map<string, TimelineItem[]>()
  for (const i of items.filter((x) => x.group === 'past').sort((a, b) => b.at.localeCompare(a.at))) {
    const label = month.format(new Date(i.at))
    byMonth.set(label, [...(byMonth.get(label) ?? []), i])
  }
  for (const [label, list] of byMonth) out.push({ key: label, label, items: list })
  return out
}

/** The Activities tab's sub-tab and search box. */
export function filterTimeline(items: TimelineItem[], kind: TimelineKind | 'all', query: string): TimelineItem[] {
  const q = query.trim().toLowerCase()
  return items.filter((i) => (kind === 'all' || i.kind === kind) && (!q || `${i.title} ${i.body ?? ''} ${i.actor}`.toLowerCase().includes(q)))
}
