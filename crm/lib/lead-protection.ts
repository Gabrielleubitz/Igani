/**
 * Which leads cannot be reassigned. Pure rule (no database); see lib/lead-protection-db.ts for the lookups.
 *
 *  - A lead the salesperson sourced themselves (their own call list, dial or added contact) is always theirs.
 *  - A lead the company gave them can be reassigned until it closes. From the moment the client signs (Signed or Won),
 *    it stays with the salesperson who closed it.
 *  - Either way, once that salesperson's agreement has ended, or they were removed, the lead is free again.
 */

export interface Person {
  name: string
  /** Still an active teammate */
  active: boolean
  /** The day their agreement ended, if it has */
  terminatedAt: Date | null
}

/** Stages from the moment the client signs. */
export const CLOSED_STATUSES: readonly string[] = ['SIGNED', 'WON']

const gone = (p: Person | null): boolean => !p || !p.active || p.terminatedAt !== null

export function reassignProblem(
  lead: { sourcedById: string | null; assignedToId: string | null; status: string },
  to: string | null,
  sourcer: Person | null,
  assignee: Person | null,
): string | null {
  if (lead.sourcedById && to !== lead.sourcedById && !gone(sourcer)) {
    return `This lead was sourced by ${sourcer!.name}, so it stays theirs and can’t be reassigned.`
  }
  if (lead.assignedToId && to !== lead.assignedToId && CLOSED_STATUSES.includes(lead.status) && !gone(assignee)) {
    return `${assignee!.name} closed this deal, so it stays theirs and can’t be reassigned.`
  }
  return null
}
