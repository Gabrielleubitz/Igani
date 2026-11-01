/** One-off fix: meeting tasks whose title starts with "[Name]" belong to that registered user. Dry run unless --apply. */
import { matchPerson, splitAction } from '../lib/meeting-tasks'
import { prisma } from '../lib/prisma'
async function main() {
  const apply = process.argv.includes('--apply')
  const people = await prisma.user.findMany({ where: { role: { not: null } }, select: { id: true, name: true, email: true } })
  const logs = await prisma.activityLog.findMany({ where: { entityType: 'USER', action: 'task.created' } })
  for (const l of logs) {
    const m = l.metadata as Record<string, unknown> | null
    if (!m || m.auto !== 'meeting' || typeof m.title !== 'string' || !m.title.startsWith('[')) continue
    const { who, title } = splitAction(m.title)
    const p = matchPerson(who, people)
    if (!p) { console.log('KEEP ', who, '|', title.slice(0, 50)); continue }
    console.log(apply ? 'MOVE ' : 'WOULD', who, '->', p.name, '|', title.slice(0, 50), l.entityId === p.id ? '(already theirs)' : '')
    if (!apply) continue
    await prisma.activityLog.update({ where: { id: l.id }, data: { entityId: p.id, metadata: { ...m, title, assigneeId: p.id } } })
    await prisma.activityLog.updateMany({ where: { entityType: 'USER', entityId: l.entityId, action: { in: ['task.completed', 'task.reopened', 'task.updated'] }, metadata: { path: ['taskId'], equals: m.taskId as string } }, data: { entityId: p.id } })
  }
}
main().finally(() => prisma.$disconnect())
