import { createTask } from '@/app/sales/actions'
import type { TaskPriority } from '@/components/crm/crm-utils'
import { leadName } from '@/lib/format'
import { fromAction, json, mobileUser } from '@/lib/mobile'
import { tasksForUser } from '@/lib/tasks'

export const dynamic = 'force-dynamic'

/** My tasks on contacts (open ones, and the last 30 done), the same list as the website's Tasks page "Mine". */
export async function GET(): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  const { mine, leads } = await tasksForUser(user)
  const open = mine.filter((t) => !t.done).sort((a, b) => (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity))
  const done = mine.filter((t) => t.done).sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0)).slice(0, 30)
  return json({
    tasks: [...open, ...done].map((t) => {
      const l = leads.get(t.leadId)
      return { id: t.id, leadId: t.leadId, lead: l ? leadName(l) : 'Contact', company: l?.company ?? null, title: t.title, dueAt: t.dueAt, done: t.done, priority: t.priority, completedAt: t.completedAt }
    }),
  })
}

export async function POST(req: Request): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  const b = (await req.json().catch(() => ({}))) as { leadId?: string; title?: string; dueAt?: string | null; priority?: TaskPriority }
  return fromAction(await createTask(b.leadId ?? '', b.title ?? '', b.dueAt ?? null, b.priority ?? 'MEDIUM'))
}
