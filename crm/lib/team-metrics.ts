import type { CrmTask } from '@/components/crm/crm-utils'

/** Share of decided leads that were won, as a 0–100 integer; null until something is decided. */
export function conversionRate(won: number, lost: number): number | null {
  const decided = won + lost
  return decided === 0 ? null : Math.round((won / decided) * 100)
}

/** An unfinished task that is this person's: assigned to them, or unassigned on a lead they own. */
export function isOpenTask(t: Pick<CrmTask, 'done' | 'assigneeId'>, userId: string, leadOwner: string | null | undefined): boolean {
  return !t.done && (t.assigneeId === userId || (t.assigneeId === null && leadOwner === userId))
}

export interface Rankable {
  wonValue: number
  won: number
  name: string
}

/** Best first: revenue, then deals won, then name. */
export function rankReps<T extends Rankable>(reps: T[]): T[] {
  return [...reps].sort((a, b) => b.wonValue - a.wonValue || b.won - a.won || a.name.localeCompare(b.name))
}
