/**
 * Waiting for an answer: an email sent from the CRM can carry a reminder ("If no reply, remind me in 3 days"), a
 * normal task on the contact. When the contact's reply comes in (Gmail sync), every email of ours it answers is marked
 * replied and its reminder task is completed automatically.
 */
import { logActivity } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { loadTasks } from '@/lib/tasks'

export const FOLLOW_UP_DAYS = [0, 2, 3, 5, 7] as const
export type FollowUpDays = (typeof FOLLOW_UP_DAYS)[number]

/** The contact answered at `at`: close what was waiting on it. Returns how many sent emails got their answer. */
export async function markReplied(leadId: string, at: Date): Promise<number> {
  const waiting = await prisma.emailMessage.findMany({
    where: { leadId, direction: 'OUTBOUND', repliedAt: null, sentAt: { lte: at } },
    select: { id: true, followUpTaskId: true },
  })
  if (!waiting.length) return 0
  await prisma.emailMessage.updateMany({ where: { id: { in: waiting.map((w) => w.id) }, repliedAt: null }, data: { repliedAt: at } })
  const taskIds = waiting.map((w) => w.followUpTaskId).filter((t): t is string => Boolean(t))
  if (taskIds.length) {
    const open = (await loadTasks([leadId])).filter((t) => taskIds.includes(t.id) && !t.done)
    for (const t of open) await logActivity({ entityType: 'LEAD', entityId: leadId, action: 'task.completed', metadata: { taskId: t.id, auto: 'email-replied' } })
  }
  return waiting.length
}
