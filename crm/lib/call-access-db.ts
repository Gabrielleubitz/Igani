import 'server-only'
import { callRelation, type CallRelation, type Viewer } from './call-access'
import { prisma } from './prisma'

/** How this person is related to the call (null: not allowed to open it). */
export async function relationToCall(viewer: Viewer, call: { id: string; userId: string | null; private?: boolean }): Promise<CallRelation> {
  if (call.private) return call.userId === viewer.id ? 'owner' : null
  if (viewer.role === 'ADMIN') return 'admin'
  if (call.userId === viewer.id) return 'owner'
  const row = await prisma.callShare.findUnique({ where: { callId_userId: { callId: call.id, userId: viewer.id } }, select: { userId: true } })
  return callRelation(viewer, call, row ? [row.userId] : [])
}
