export function formatDateTime(d: Date, timeZone: string): string {
  // dateStyle/timeStyle cannot be combined with timeZoneName, so the zone label is formatted separately.
  const when = new Intl.DateTimeFormat('en-US', { timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(d)
  const zone = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(d).find((p) => p.type === 'timeZoneName')?.value
  return zone ? `${when} ${zone}` : when
}

export function leadName(l: { firstName: string | null; lastName: string | null; email: string }): string {
  return [l.firstName, l.lastName].filter(Boolean).join(' ') || l.email
}

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'PROPOSAL_SENT', 'WON', 'LOST'] as const satisfies readonly import('@prisma/client').LeadStatus[]
