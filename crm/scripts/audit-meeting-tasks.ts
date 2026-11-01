import { prisma } from '../lib/prisma'
import { classifyActions } from '../lib/meeting-tasks'
import { organizedFor } from '../lib/organize-notes'
async function main() {
  const people = await prisma.user.findMany({ where: { role: { not: null } }, select: { id: true, name: true, email: true, role: true } })
  console.log('USERS', JSON.stringify(people))
  const ms = await prisma.booking.findMany({ where: { meeting: { isNot: null } }, include: { meeting: true } })
  for (const b of ms) {
    const notes = organizedFor(b.meeting!).notes
    console.log('MEETING', b.id, b.title, b.source, b.hostId, b.meeting!.notesStatus, JSON.stringify(notes?.actions))
    if (notes) console.log('PLAN', JSON.stringify(classifyActions(notes.actions, people, b.hostId)))
  }
  const logs = await prisma.activityLog.findMany({ where: { entityType: 'USER', action: { startsWith: 'task.' } }, orderBy: { createdAt: 'asc' } })
  for (const l of logs) console.log('LOG', l.id, l.entityId, l.action, JSON.stringify(l.metadata))
}
main().finally(() => prisma.$disconnect())
