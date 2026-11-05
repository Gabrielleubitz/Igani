import type { LeadStatus } from '@prisma/client'

export function formatDateTime(d: Date, timeZone: string): string {
  // dateStyle/timeStyle cannot be combined with timeZoneName, so the zone label is formatted separately.
  const when = new Intl.DateTimeFormat('en-US', { timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(d)
  const zone = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(d).find((p) => p.type === 'timeZoneName')?.value
  return zone ? `${when} ${zone}` : when
}

export function formatDate(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, dateStyle: 'medium' }).format(d)
}

/** "3 min ago", "2 days ago", "in 4 hours" — for timelines and lists. */
export function timeAgo(d: Date, now: Date = new Date()): string {
  const diff = d.getTime() - now.getTime()
  const abs = Math.abs(diff)
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 864e5],
    ['month', 30 * 864e5],
    ['week', 7 * 864e5],
    ['day', 864e5],
    ['hour', 36e5],
    ['minute', 6e4],
  ]
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  for (const [unit, ms] of units) if (abs >= ms) return rtf.format(Math.round(diff / ms), unit)
  return 'just now'
}

export function formatMoney(n: number | null | undefined): string {
  return n == null ? '—' : n.toLocaleString('en-US')
}

export function leadName(l: { firstName: string | null; lastName: string | null; email: string | null; phone?: string | null; company?: string | null }): string {
  return [l.firstName, l.lastName].filter(Boolean).join(' ') || l.company || l.email || l.phone || 'Unnamed contact'
}

/** Where a lead came from, as presets the team picks from (free text is allowed too). */
export const LEAD_SOURCES = [
  'Website contact form',
  'Landing page',
  'Booking page',
  'Referral',
  'Existing client',
  'LinkedIn',
  'Facebook / Instagram',
  'Google search',
  'Google Ads',
  'WhatsApp',
  'Phone call',
  'Email',
  'Event / networking',
  'Cold outreach',
  'Partner',
  'Other',
] as const

export const LEAD_STATUSES = ['NEW', 'NO_ANSWER', 'CALL_BACK', 'VOICEMAIL', 'BUSY', 'INTERESTED', 'NOT_INTERESTED', 'WRONG_NUMBER', 'CONTACTED', 'DEMO_SCHEDULED', 'DEMO_SENT', 'PROPOSAL_SENT', 'SIGNED', 'WON', 'LOST'] as const satisfies readonly LeadStatus[]

/** Human labels for pipeline stages (used everywhere instead of raw enum values). */
export const STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: 'New',
  NO_ANSWER: 'No answer (NA)',
  CALL_BACK: 'Call back',
  VOICEMAIL: 'Voicemail',
  BUSY: 'Busy',
  INTERESTED: 'Interested',
  NOT_INTERESTED: 'Not interested',
  WRONG_NUMBER: 'Wrong number',
  CONTACTED: 'Contacted',
  DEMO_SCHEDULED: 'Demo scheduled',
  DEMO_SENT: 'Demo sent',
  PROPOSAL_SENT: 'Proposal sent',
  SIGNED: 'Signed',
  WON: 'Won',
  LOST: 'Lost',
}

/** Tailwind classes for a stage pill (dot + tint), shared by tables, cards and the board. */
export const STATUS_TONE: Record<LeadStatus, string> = {
  NEW: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  NO_ANSWER: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  CALL_BACK: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  VOICEMAIL: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  BUSY: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  INTERESTED: 'bg-lime-500/15 text-lime-300 border-lime-500/30',
  NOT_INTERESTED: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
  WRONG_NUMBER: 'bg-stone-500/15 text-stone-300 border-stone-500/30',
  CONTACTED: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  DEMO_SCHEDULED: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  DEMO_SENT: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  PROPOSAL_SENT: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  SIGNED: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  WON: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  LOST: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

export function statusLabel(s: string): string {
  return STATUS_LABEL[s as LeadStatus] ?? s
}
