/** Who may open a call. Pure, so it can be unit-tested; the database lookups live in call-access-db.ts. */

export interface Viewer {
  id: string
  role: string
}

export type CallRelation = 'admin' | 'owner' | 'shared' | null

/** admin sees every call, the caller sees their own, and a salesman an admin added sees that call (view only). */
export function callRelation(viewer: Viewer, call: { userId: string | null }, sharedWith: readonly string[]): CallRelation {
  if (viewer.role === 'ADMIN') return 'admin'
  if (call.userId && call.userId === viewer.id) return 'owner'
  return sharedWith.includes(viewer.id) ? 'shared' : null
}
