import type { LeadStatus } from '@prisma/client'

/**
 * Who may move a lead through the pipeline:
 *  - Admins: every stage, and they own the revenue numbers.
 *  - Everyone else: only up to "Demo scheduled". Proposal sent, Won and Lost (and the deal value that goes with them)
 *    belong to admins, and a lead that has already gone past Demo scheduled is locked for non-admins.
 */
export const SALES_STAGES: readonly LeadStatus[] = ['NEW', 'CONTACTED', 'DEMO_SCHEDULED']

const LABEL: Record<LeadStatus, string> = { NEW: 'New', CONTACTED: 'Contacted', DEMO_SCHEDULED: 'Demo scheduled', PROPOSAL_SENT: 'Proposal sent', WON: 'Won', LOST: 'Lost' }

const isAdmin = (role: string | null | undefined): boolean => role === 'ADMIN'

/** May this role move a lead INTO `to`? */
export function canSetStage(role: string | null | undefined, to: LeadStatus): boolean {
  return isAdmin(role) || SALES_STAGES.includes(to)
}

/** May this role change the stage or deal value of a lead that is currently at `current`? */
export function canEditAtStage(role: string | null | undefined, current: LeadStatus): boolean {
  return isAdmin(role) || SALES_STAGES.includes(current)
}

/** Why a stage change is refused, or null when it is allowed. */
export function stageChangeProblem(role: string | null | undefined, current: LeadStatus, to: LeadStatus): string | null {
  if (!canEditAtStage(role, current)) return `This lead is already at "${LABEL[current]}". Only an admin can change its stage or revenue from here.`
  if (!canSetStage(role, to)) return `Only an admin can move a lead to "${LABEL[to]}". You can take it up to "Demo scheduled".`
  return null
}

/** Stages offered in a dropdown: everything for admins, otherwise up to Demo scheduled. */
export function stagesFor(role: string | null | undefined, all: readonly LeadStatus[]): readonly LeadStatus[] {
  return isAdmin(role) ? all : all.filter((s) => SALES_STAGES.includes(s))
}
