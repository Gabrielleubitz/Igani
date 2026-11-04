import type { LeadStatus } from '@prisma/client'

/**
 * Call results as lead statuses. When an agent wraps up a call, the lead gets the status they marked.
 * Pure (no database) so the rules can be tested.
 */
export const CALL_STATUSES = ['NO_ANSWER', 'CALL_BACK', 'VOICEMAIL', 'BUSY', 'INTERESTED', 'NOT_INTERESTED', 'WRONG_NUMBER'] as const satisfies readonly LeadStatus[]

/** Call result that ends the conversation with this person (closed, like Lost) */
export const CLOSED_CALL_STATUSES: readonly LeadStatus[] = ['NOT_INTERESTED', 'WRONG_NUMBER']

/** Everything before a demo: new leads and every call result. Quoting, booking or publishing an offer moves these forward. */
export const EARLY_STATUSES = ['NEW', ...CALL_STATUSES, 'CONTACTED'] as const satisfies readonly LeadStatus[]

export const OUTCOME_STATUS: Record<string, LeadStatus> = {
  connected: 'CONTACTED',
  interested: 'INTERESTED',
  callback: 'CALL_BACK',
  no_answer: 'NO_ANSWER',
  voicemail: 'VOICEMAIL',
  busy: 'BUSY',
  not_interested: 'NOT_INTERESTED',
  wrong_number: 'WRONG_NUMBER',
}

/**
 * The status a lead gets after a call result, or null to leave it alone. A call never pulls a lead back out of the deal
 * stages (Demo scheduled and later), and never changes one that already has the same status.
 */
export function statusAfterCall(current: LeadStatus, outcome: string): LeadStatus | null {
  const next = OUTCOME_STATUS[outcome]
  if (!next || next === current) return null
  return (EARLY_STATUSES as readonly string[]).includes(current) ? next : null
}

/**
 * May this person place a call to a number that is already a lead? Admins always. Otherwise only when the lead is unassigned
 * or already theirs; a lead assigned to someone else blocks the call.
 */
export function callBlockedByOwner(lead: { assignedToId: string | null }, user: { id: string; role: string }): boolean {
  return user.role !== 'ADMIN' && lead.assignedToId !== null && lead.assignedToId !== user.id
}
