import Link from 'next/link'
import { foldTasks, splitDue } from './crm-utils'
import { prisma } from '@/lib/prisma'

/** Banner shown on every /sales page: the caller's overdue and due-today tasks. */
export async function TaskAlert({ userId, isAdmin }: { userId: string; isAdmin: boolean }): Promise<React.ReactElement | null> {
  const logs = await prisma.activityLog.findMany({
    where: { entityType: 'LEAD', action: { in: ['task.created', 'task.completed'] } },
    orderBy: { createdAt: 'desc' },
    take: 3000,
  })
  const mine = foldTasks(logs).filter((t) => isAdmin || t.assigneeId === userId)
  const { overdue, today } = splitDue(mine)
  if (overdue.length === 0 && today.length === 0) return null
  return (
    <Link
      href="/sales/tasks"
      className={`mb-6 block rounded-md border px-4 py-2 text-sm ${overdue.length ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-amber-500/40 bg-amber-500/10 text-amber-200'}`}
    >
      {overdue.length ? `${overdue.length} overdue task${overdue.length === 1 ? '' : 's'}` : null}
      {overdue.length && today.length ? ' · ' : null}
      {today.length ? `${today.length} due today` : null} — view tasks →
    </Link>
  )
}
