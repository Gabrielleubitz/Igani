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

export function leadName(l: { firstName: string | null; lastName: string | null; email: string }): string {
  return [l.firstName, l.lastName].filter(Boolean).join(' ') || l.email
}

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'PROPOSAL_SENT', 'WON', 'LOST'] as const satisfies readonly LeadStatus[]

/** Human labels for pipeline stages (used everywhere instead of raw enum values). */
export const STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  DEMO_SCHEDULED: 'Demo scheduled',
  PROPOSAL_SENT: 'Proposal sent',
  WON: 'Won',
  LOST: 'Lost',
}

/** Tailwind classes for a stage pill (dot + tint), shared by tables, cards and the board. */
export const STATUS_TONE: Record<LeadStatus, string> = {
  NEW: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  CONTACTED: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  DEMO_SCHEDULED: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  PROPOSAL_SENT: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  WON: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  LOST: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

export function statusLabel(s: string): string {
  return STATUS_LABEL[s as LeadStatus] ?? s
}
