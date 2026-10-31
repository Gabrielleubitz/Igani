import Link from 'next/link'
import { splitDue } from './crm-utils'
import { prisma } from '@/lib/prisma'
import { isMyTask, loadTasks } from '@/lib/tasks'

/** Banner on every CRM page: the signed-in user's own overdue and due-today tasks. */
export async function TaskAlert({ userId }: { userId: string }): Promise<React.ReactElement | null> {
  const owned = await prisma.lead.findMany({ where: { OR: [{ assignedToId: userId }] }, select: { id: true } })
  const ownedIds = new Set(owned.map((l) => l.id))
  const mine = (await loadTasks()).filter((t) => isMyTask(t, userId, ownedIds.has(t.leadId) ? userId : null))
  const { overdue, today } = splitDue(mine)
  if (overdue.length === 0 && today.length === 0) return null
  return (
    <Link
      href="/sales/tasks"
      className={`mb-6 flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors ${overdue.length ? 'border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/15' : 'border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15'}`}
    >
      <span>
        <span aria-hidden>{overdue.length ? '⏰ ' : '📌 '}</span>
        {overdue.length ? `${overdue.length} overdue task${overdue.length === 1 ? '' : 's'}` : null}
        {overdue.length && today.length ? ' · ' : null}
        {today.length ? `${today.length} due today` : null}
      </span>
      <span className="font-medium">View tasks →</span>
    </Link>
  )
}
