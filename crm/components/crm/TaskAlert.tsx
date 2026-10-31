import Link from 'next/link'
import { splitDue } from './crm-utils'
import { prisma } from '@/lib/prisma'
import { tasksForUser } from '@/lib/tasks'

/** Banner on every CRM page: the signed-in user's own overdue and due-today tasks (today = in their time zone). */
export async function TaskAlert({ userId, role }: { userId: string; role: string }): Promise<React.ReactElement | null> {
  const [{ mine }, me] = await Promise.all([tasksForUser({ id: userId, role }), prisma.user.findUnique({ where: { id: userId }, select: { timeZone: true } })])
  const { overdue, today } = splitDue(mine, new Date(), me?.timeZone ?? 'UTC')
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
