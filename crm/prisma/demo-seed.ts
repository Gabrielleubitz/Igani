/**
 * DEV/QA ONLY: fills an empty local database with a realistic demo team, contacts, tasks and meetings
 * so every CRM screen can be clicked through. Refuses to run with NODE_ENV=production.
 *   npx tsx prisma/demo-seed.ts
 * Then sign in at /login with DEV_LOGIN=1 as admin@igani.test, sales@igani.test or marketing@igani.test.
 */
import { randomUUID } from 'node:crypto'
import { PrismaClient, type LeadStatus, type Role } from '@prisma/client'

const prisma = new PrismaClient()
const day = 864e5

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') throw new Error('demo-seed is for local development only')
  if ((await prisma.lead.count()) > 0) throw new Error('Database already has contacts; demo-seed only runs on an empty CRM.')

  const team: [string, string, Role][] = [
    ['admin@igani.test', 'Gabriel Admin', 'ADMIN'],
    ['sales@igani.test', 'Noa Sales', 'SALES'],
    ['sales2@igani.test', 'Ari Sales', 'SALES'],
    ['marketing@igani.test', 'Maya Marketing', 'MARKETING'],
  ]
  const users: Record<string, string> = {}
  for (const [email, name, role] of team) {
    await prisma.allowedUser.upsert({ where: { email }, create: { email, role, inviteAcceptedAt: new Date() }, update: { role, active: true } })
    const u = await prisma.user.upsert({ where: { email }, create: { email, name, role, timeZone: 'Asia/Jerusalem' }, update: { name, role } })
    users[role === 'SALES' && users.SALES ? 'SALES2' : role] = u.id
  }
  await prisma.allowedUser.create({ data: { email: 'newhire@igani.test', role: 'SALES', invitedAt: new Date(Date.now() - 2 * day), inviteToken: randomUUID() } })
  for (const host of [users.ADMIN!, users.SALES!]) {
    await prisma.availability.createMany({ data: [0, 1, 2, 3, 4].map((d) => ({ hostId: host, dayOfWeek: d, startTime: '09:00', endTime: '17:00' })) })
  }
  await prisma.bookingPage.create({ data: { slug: 'intro', title: 'Intro call with Igani', description: 'A quick 30-minute chat about your project.', durationMinutes: 30, hostId: users.ADMIN! } })
  await prisma.bookingPage.create({ data: { slug: 'strategy', title: 'Website strategy session', durationMinutes: 60, requiresApproval: true, hostId: users.SALES! } })

  const people: [string, string, string, string, LeadStatus, string | null, number | null, string][] = [
    ['Dana', 'Levi', 'dana@acme.com', 'Acme', 'NEW', null, null, 'igani.co'],
    ['Yoni', 'Cohen', 'yoni@bluebird.io', 'Bluebird', 'CONTACTED', 'SALES', null, 'igani.co'],
    ['Maya', 'Ben-David', 'maya@studio-m.co', 'Studio M', 'DEMO_SCHEDULED', 'SALES', 8000, 'booking-page'],
    ['Omer', 'Katz', 'omer@fintechly.com', 'Fintechly', 'PROPOSAL_SENT', 'SALES', 24000, 'referral'],
    ['Lior', 'Shapiro', 'lior@gmail.com', '', 'NEW', 'SALES2', null, 'igani.co'],
    ['Tal', 'Friedman', 'tal@greenleaf.org', 'Greenleaf', 'WON', 'SALES', 15000, 'igani.co'],
    ['Noam', 'Peretz', 'noam@urbanfit.co', 'UrbanFit', 'LOST', 'SALES2', null, 'linkedin'],
    ['Shira', 'Azoulay', 'shira@nomad.travel', 'Nomad Travel', 'CONTACTED', 'ADMIN', 12000, 'igani.co'],
    ['Eitan', 'Mizrahi', 'eitan@cloudnine.dev', 'CloudNine', 'NEW', null, null, 'csv-import'],
    ['Rotem', 'Golan', 'rotem@bakery.co.il', 'Golan Bakery', 'PROPOSAL_SENT', 'ADMIN', 6000, 'referral'],
    ['Avi', 'Segal', 'avi@segal-law.com', 'Segal Law', 'DEMO_SCHEDULED', 'SALES2', 9500, 'igani.co'],
    ['Hila', 'Weiss', 'hila@petpal.app', 'PetPal', 'WON', 'ADMIN', 30000, 'linkedin'],
  ]
  const ids: string[] = []
  for (const [i, [firstName, lastName, email, company, status, owner, dealValue, source]] of people.entries()) {
    const lead = await prisma.lead.create({
      data: {
        firstName,
        lastName,
        email,
        company: company || null,
        phone: i % 3 === 0 ? null : `+972 50 ${String(1000000 + i * 7919).slice(0, 3)} ${String(1000 + i * 37).slice(0, 4)}`,
        status,
        dealValue,
        source,
        budget: i % 2 ? `$${(i + 3) * 1000}` : null,
        website: company ? `${company.toLowerCase().replace(/\s+/g, '')}.com` : null,
        message: i % 2 === 0 ? `Hi Igani! We're ${company || 'a small team'} and need a new website. Can we talk this week?` : null,
        utmSource: i % 3 === 0 ? 'google' : i % 3 === 1 ? 'facebook' : null,
        utmCampaign: i % 3 === 0 ? 'fall-promo' : null,
        tags: ['inbound', ...(i % 4 === 0 ? ['ecommerce'] : []), ...(i % 5 === 0 ? ['priority'] : [])],
        lostReason: status === 'LOST' ? 'Budget: went with a cheaper freelancer' : null,
        assignedToId: owner ? users[owner]! : null,
        createdAt: new Date(Date.now() - (i * 2 + 1) * day),
      },
    })
    ids.push(lead.id)
    await prisma.activityLog.create({ data: { entityType: 'LEAD', entityId: lead.id, action: 'lead.created', metadata: { source }, createdAt: lead.createdAt } })
    if (status === 'WON') await prisma.activityLog.create({ data: { entityType: 'LEAD', entityId: lead.id, action: 'lead.status_changed', actorId: lead.assignedToId, metadata: { from: 'PROPOSAL_SENT', to: 'WON', dealValue }, createdAt: new Date(Date.now() - 3 * day) } })
  }
  const task = async (leadIdx: number, title: string, dueInDays: number | null, assignee: string, priority = 'MEDIUM'): Promise<void> => {
    await prisma.activityLog.create({
      data: { entityType: 'LEAD', entityId: ids[leadIdx]!, action: 'task.created', actorId: assignee, metadata: { taskId: randomUUID(), title, dueAt: dueInDays === null ? null : new Date(Date.now() + dueInDays * day).toISOString(), assigneeId: assignee, priority } },
    })
  }
  await task(1, 'Send pricing deck', -1, users.SALES!, 'HIGH')
  await task(3, 'Follow up on proposal', 0.2, users.SALES!)
  await task(2, 'Prepare demo for Studio M', 1, users.SALES!)
  await task(7, 'Call Shira about scope', -2, users.ADMIN!, 'HIGH')
  await task(9, 'Send revised quote', 2, users.ADMIN!)
  await task(10, 'Check in after demo', null, users.SALES2!, 'LOW')
  await prisma.activityLog.create({ data: { entityType: 'LEAD', entityId: ids[3]!, action: 'note.added', actorId: users.SALES!, metadata: { body: 'Omer wants the site live before their Series A announcement in January.' } } })
  await prisma.activityLog.create({ data: { entityType: 'LEAD', entityId: ids[3]!, action: 'touch.logged', actorId: users.SALES!, metadata: { kind: 'call', summary: 'Walked through the proposal, waiting on CFO sign-off' }, createdAt: new Date(Date.now() - day) } })

  const at = (d: number, h: number): Date => {
    const x = new Date(Date.now() + d * day)
    x.setUTCHours(h, 0, 0, 0)
    return x
  }
  const booking = (lead: number, host: string, start: Date, status: 'PENDING' | 'CONFIRMED' | 'CANCELLED', source: 'SALES_INVITE' | 'PUBLIC_PAGE', title: string) =>
    prisma.booking.create({
      data: { leadId: ids[lead]!, hostId: host, startTime: start, endTime: new Date(start.getTime() + 30 * 60_000), status, source, title, guestName: `${people[lead]![0]} ${people[lead]![1]}`, guestEmail: people[lead]![2], meetUrl: status === 'CONFIRMED' ? 'https://meet.google.com/abc-defg-hij' : null, inviteToken: null, confirmedAt: status === 'CONFIRMED' ? new Date() : null },
    })
  await booking(2, users.SALES!, at(1, 8), 'CONFIRMED', 'SALES_INVITE', 'Igani demo')
  await booking(10, users.SALES!, at(3, 10), 'PENDING', 'PUBLIC_PAGE', 'Website strategy session')
  await booking(0, users.ADMIN!, at(2, 11), 'PENDING', 'SALES_INVITE', 'Igani intro call')
  await booking(5, users.ADMIN!, at(-5, 9), 'CONFIRMED', 'PUBLIC_PAGE', 'Intro call with Igani')
  await booking(6, users.SALES2!, at(-3, 12), 'CANCELLED', 'SALES_INVITE', 'Igani intro call')
  console.log(`✓ Demo data ready: ${people.length} contacts, 4 teammates, 2 booking pages, 5 meetings.`)
}

main()
  .catch((err: unknown) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => void prisma.$disconnect())
