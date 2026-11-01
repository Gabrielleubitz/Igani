import type { LeadStatus } from '@prisma/client'

/**
 * Who may move a lead through the pipeline:
 *  - Admins: every stage, and they own the revenue numbers.
 *  - Everyone else: they can take a lead up to "Demo scheduled", but the moment it is there its stage is locked and only
 *    an admin can change it. Proposal sent, Won and Lost (and the deal value past the demo) belong to admins.
 */
export const SALES_STAGES: readonly LeadStatus[] = ['NEW', 'CONTACTED', 'DEMO_SCHEDULED']
/** Stages a lead can still be moved FROM by a non-admin. */
const SALES_EDITABLE_FROM: readonly LeadStatus[] = ['NEW', 'CONTACTED']

const LABEL: Record<LeadStatus, string> = { NEW: 'New', CONTACTED: 'Contacted', DEMO_SCHEDULED: 'Demo scheduled', PROPOSAL_SENT: 'Proposal sent', WON: 'Won', LOST: 'Lost' }

const isAdmin = (role: string | null | undefined): boolean => role === 'ADMIN'

/** May this role move a lead INTO `to`? */
export function canSetStage(role: string | null | undefined, to: LeadStatus): boolean {
  return isAdmin(role) || SALES_STAGES.includes(to)
}

/** May this role change the stage of a lead that is currently at `current`? Non-admins: only before Demo scheduled. */
export function canEditAtStage(role: string | null | undefined, current: LeadStatus): boolean {
  return isAdmin(role) || SALES_EDITABLE_FROM.includes(current)
}

/** May this role change the deal value of a lead at `current`? Non-admins: up to and including Demo scheduled. */
export function canEditValueAtStage(role: string | null | undefined, current: LeadStatus): boolean {
  return isAdmin(role) || SALES_STAGES.includes(current)
}

/** Why a stage change is refused, or null when it is allowed. */
export function stageChangeProblem(role: string | null | undefined, current: LeadStatus, to: LeadStatus): string | null {
  if (!canEditAtStage(role, current)) return `This lead is at "${LABEL[current]}". Once a lead reaches Demo scheduled, only an admin can change its stage.`
  if (!canSetStage(role, to)) return `Only an admin can move a lead to "${LABEL[to]}". You can take it up to "Demo scheduled".`
  return null
}

/** Stages offered in a dropdown: everything for admins, otherwise up to Demo scheduled. */
export function stagesFor(role: string | null | undefined, all: readonly LeadStatus[]): readonly LeadStatus[] {
  return isAdmin(role) ? all : all.filter((s) => SALES_STAGES.includes(s))
}
