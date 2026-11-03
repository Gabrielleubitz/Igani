import type { LeadStatus } from '@prisma/client'

/**
 * Who may move a lead through the pipeline:
 *  - Admins: every stage, and they own the revenue numbers.
 *  - Everyone else: they work the early stages (New, Contacted, Demo scheduled) and can move a lead between them,
 *    including back to New/Contacted. The later stages (Demo sent, Proposal sent, Signed, Won, Lost) are set by admins only:
 *    once an admin has put a lead there, a salesperson can no longer change its stage or its deal value.
 */
export const SALES_STAGES: readonly LeadStatus[] = ['NEW', 'CONTACTED', 'DEMO_SCHEDULED']
/** Stages a lead can still be moved FROM by a non-admin: the same early stages. */
const SALES_EDITABLE_FROM: readonly LeadStatus[] = SALES_STAGES

const LABEL: Record<LeadStatus, string> = { NEW: 'New', CONTACTED: 'Contacted', DEMO_SCHEDULED: 'Demo scheduled', DEMO_SENT: 'Demo sent', PROPOSAL_SENT: 'Proposal sent', SIGNED: 'Signed', WON: 'Won', LOST: 'Lost' }

const isAdmin = (role: string | null | undefined): boolean => role === 'ADMIN'

/** May this role move a lead INTO `to`? */
export function canSetStage(role: string | null | undefined, to: LeadStatus): boolean {
  return isAdmin(role) || SALES_STAGES.includes(to)
}

/** May this role change the stage of a lead that is currently at `current`? Non-admins: only while it is in an early stage. */
export function canEditAtStage(role: string | null | undefined, current: LeadStatus): boolean {
  return isAdmin(role) || SALES_EDITABLE_FROM.includes(current)
}

/** Why a stage change is refused, or null when it is allowed. */
export function stageChangeProblem(role: string | null | undefined, current: LeadStatus, to: LeadStatus): string | null {
  if (!canEditAtStage(role, current)) return `This lead is at "${LABEL[current]}", which an admin set. Only an admin can change its stage now.`
  if (!canSetStage(role, to)) return `Only an admin can move a lead to "${LABEL[to]}". Salespeople can use New, Contacted and Demo scheduled.`
  return null
}

/** Stages offered in a dropdown: everything for admins, otherwise up to Demo scheduled. */
export function stagesFor(role: string | null | undefined, all: readonly LeadStatus[]): readonly LeadStatus[] {
  return isAdmin(role) ? all : all.filter((s) => SALES_STAGES.includes(s))
}
