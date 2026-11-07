import { leadName } from '@/lib/format'
import { assertCanSeeLead } from '@/lib/lead-access'
import { fail, json, mobileUser } from '@/lib/mobile'
import { prisma } from '@/lib/prisma'
import { loadTasks } from '@/lib/tasks'

export const dynamic = 'force-dynamic'

/** One lead for the app: details, open and done tasks, notes and recent calls. Only if this person may see it. */
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  const { id } = await props.params
  try {
    await assertCanSeeLead(id.slice(0, 40), user)
  } catch {
    return fail('Contact not found.', 404)
  }
  const [l, tasks, people] = await Promise.all([
    prisma.lead.findUniqueOrThrow({
      where: { id },
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true, company: true, website: true, message: true, source: true, sourceDetail: true, status: true, tags: true, createdAt: true, updatedAt: true,
        assignedTo: { select: { id: true, name: true } },
        notes: { orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, body: true, createdAt: true, author: { select: { name: true, email: true } } } },
        calls: { orderBy: { startedAt: 'desc' }, take: 10, select: { id: true, direction: true, status: true, startedAt: true, durationSec: true } },
        _count: { select: { emails: true, offers: true, calls: true } },
      },
    }),
    loadTasks([id]),
    prisma.user.findMany({ where: { role: { not: null } }, select: { id: true, name: true, email: true } }),
  ])
  const nameOf = new Map(people.map((p) => [p.id, p.name ?? p.email ?? 'Teammate']))
  return json({
    id: l.id,
    name: leadName(l),
    firstName: l.firstName,
    lastName: l.lastName,
    email: l.email,
    phone: l.phone,
    company: l.company,
    website: l.website,
    message: l.message,
    source: l.source,
    sourceDetail: l.sourceDetail,
    status: l.status,
    tags: l.tags,
    owner: l.assignedTo ? { id: l.assignedTo.id, name: l.assignedTo.name } : null,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
    counts: l._count,
    notes: l.notes.map((n) => ({ id: n.id, body: n.body, at: n.createdAt, author: n.author?.name ?? n.author?.email ?? null })),
    calls: l.calls,
    tasks: tasks
      .sort((a, b) => Number(a.done) - Number(b.done) || (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity))
      .map((t) => ({ id: t.id, title: t.title, dueAt: t.dueAt, done: t.done, priority: t.priority, assignee: t.assigneeId ? (t.assigneeId === user.id ? 'You' : (nameOf.get(t.assigneeId) ?? null)) : null })),
  })
}
