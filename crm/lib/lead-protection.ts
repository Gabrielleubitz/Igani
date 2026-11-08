/**
 * A lead a salesperson sourced themselves (their own call list, dial or added contact) stays theirs: it can't be reassigned or
 * unassigned while their agreement is active. Pure rule (no database); see lib/lead-protection-db.ts for the lookup.
 */

export interface Sourcer {
  name: string
  /** Still an active teammate */
  active: boolean
  /** The day their agreement ended, if it has */
  terminatedAt: Date | null
}

/** Why this lead may not be given to `to`, or null when it may. A removed or departed sourcer frees the lead. */
export function reassignProblem(lead: { sourcedById: string | null; assignedToId: string | null }, to: string | null, sourcer: Sourcer | null): string | null {
  if (!lead.sourcedById) return null
  if (to === lead.sourcedById) return null
  if (!sourcer || !sourcer.active || sourcer.terminatedAt) return null
  return `This lead was sourced by ${sourcer.name}, so it stays theirs and can’t be reassigned.`
}
