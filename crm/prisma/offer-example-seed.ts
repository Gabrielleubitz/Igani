/**
 * Local only: the Cryotherapy Rejuvenate example offer (content in offers/cryo/), linked to a lead.
 * Run: npx tsx prisma/offer-example-seed.ts   → then open http://cryo.localhost:3100
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production' || !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? '')) throw new Error('Refusing to seed: this is for the local database only.')
  const email = 'info@cryotherapyrejuvenate.com'
  const lead =
    (await prisma.lead.findUnique({ where: { email }, select: { id: true } })) ??
    (await prisma.lead.create({ data: { email, firstName: 'Mike', lastName: 'Amory', company: 'Cryotherapy Rejuvenate', phone: '570-290-1979', website: 'https://cryotherapyrejuvenate.com', source: 'example', status: 'PROPOSAL_SENT' }, select: { id: true } }))
  const modules = [
    { id: 'infra', group: 'core', name: 'Platform and environments', price: 2500, required: true, included: true },
    { id: 'site', group: 'main', name: 'Clinic website', price: 4500, required: false, included: true },
    { id: 'booking', group: 'main', name: 'Online booking and payment', price: 6000, required: false, included: true },
    { id: 'packages', group: 'main', name: 'Packages and memberships', price: 2500, required: false, included: true },
    { id: 'staff', group: 'main', name: 'Staff console', price: 3000, required: false, included: true },
    { id: 'automation', group: 'addons', name: 'Emails and reminders', price: 1200, required: false, included: false },
    { id: 'kiosk', group: 'addons', name: 'Check-in kiosk and card reader', price: 3500, required: false, included: false },
  ]
  const data = { title: 'Website and booking system for Cryotherapy Rejuvenate', currency: 'USD', monthlyPrice: 250, timelineMonths: 3, modules }
  await prisma.offer.upsert({ where: { slug: 'cryo' }, create: { slug: 'cryo', leadId: lead.id, ...data }, update: data })
  console.log('Example offer ready: http://cryo.localhost:3100  (admin: http://localhost:3100/admin/offers)')
}

main().finally(() => prisma.$disconnect())
