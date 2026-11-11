import { PrismaClient } from '@prisma/client'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
Object.assign(process.env, { NEXTAUTH_SECRET: 'test-secret-test-secret-test-secret', NEXT_PUBLIC_APP_URL: 'https://app.igani.co', OPENAI_API_KEY: 'sk-test' })

const d = testDb ? describe : describe.skip
const DAY = 86_400_000

d('follow-up assistant and brief', async () => {
  const { draftFollowUp, runFollowUpAssistant } = await import('@/lib/follow-ups')
  const { loadLeadHistory, historyText } = await import('@/lib/lead-history')
  const { briefLead } = await import('@/lib/lead-brief')
  const { loadTasks } = await import('@/lib/tasks')
  const prisma = new PrismaClient()
  let userId = ''
  let leadId = ''
  let prompts: string[] = []

  beforeEach(async () => {
    prompts = []
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      if (!String(url).includes('/chat/completions')) return new Response('unexpected', { status: 500 })
      const req = JSON.parse(String(init?.body ?? '{}')) as { messages: { content: string }[]; response_format: { json_schema: { name: string } } }
      prompts.push(req.messages[1]!.content)
      const content =
        req.response_format.json_schema.name === 'follow_up'
          ? { subject: 'Your quote', body: 'Hi Dana, here is where we are with the quote. Does Sunday at 10 work to go over it? Gabriel' }
          : { standing: 'Dana runs a design studio and wants online booking. She asked for a quote.', decided: ['A demo on Sunday'], objections: ['Price'], openPromises: [{ who: 'us', text: 'Send the quote' }], nextStep: 'Send the quote today and confirm Sunday.' }
      return Response.json({ choices: [{ message: { content: JSON.stringify(content) } }] })
    })
    await prisma.followUpDraft.deleteMany()
    await prisma.emailMessage.deleteMany()
    await prisma.smsMessage.deleteMany()
    await prisma.call.deleteMany()
    await prisma.activityLog.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    userId = (await prisma.user.create({ data: { email: 'rep@igani.co', name: 'Gabriel', role: 'SALES' } })).id
    leadId = (await prisma.lead.create({ data: { email: 'dana@x.com', firstName: 'Dana', phone: '+972501234567', status: 'INTERESTED', assignedToId: userId } })).id
  })
  afterEach(() => vi.unstubAllGlobals())
  afterAll(async () => {
    await prisma.followUpDraft.deleteMany()
    await prisma.emailMessage.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  const email = (dir: 'INBOUND' | 'OUTBOUND', daysAgo: number, body: string) =>
    prisma.emailMessage.create({
      data: { leadId, mailboxUserId: userId, externalId: `x${Math.random()}`, dedupeKey: `x${Math.random()}`, direction: dir, fromEmail: dir === 'INBOUND' ? 'dana@x.com' : 'rep@igani.co', subject: 'Booking site', snippet: body.slice(0, 50), bodyText: body, sentAt: new Date(Date.now() - daysAgo * DAY) },
    })

  it('reads every channel into one timeline, with the last contact each way', async () => {
    await email('OUTBOUND', 6, 'Hi Dana, great to talk. I will send a quote.')
    await email('INBOUND', 2, 'Thanks! Can you send the quote before Sunday?')
    await prisma.call.create({ data: { userId, leadId, direction: 'OUTBOUND', status: 'COMPLETED', fromNumber: '+972531111111', toNumber: '+972501234567', durationSec: 0, startedAt: new Date(Date.now() - DAY) } })
    const h = await loadLeadHistory(leadId)
    expect(h.items.map((i) => i.kind)).toEqual(['email', 'email', 'call'])
    expect(h.lastIn?.getTime()).toBeGreaterThan(h.lastOut!.getTime()) // the unanswered call (no talk time) doesn't count as contact
    expect(historyText(h)).toContain('EMAIL CLIENT→US')
  })

  it('drafts a follow-up for a message we never answered, with a task, in the owner’s style', async () => {
    await email('OUTBOUND', 6, 'Hi Dana, great to talk. I will send a quote. Cheers, Gabriel')
    await email('INBOUND', 2, 'Thanks! Can you send the quote before Sunday?')
    const id = await draftFollowUp(leadId)
    expect(id).toBeTruthy()
    const draft = await prisma.followUpDraft.findUniqueOrThrow({ where: { id: id! } })
    expect(draft).toMatchObject({ userId, channel: 'email', kind: 'unanswered', status: 'open', subject: 'Your quote' })
    expect(draft.reason).toMatch(/^They emailed on/)
    // the prompt carries the reason, the history and how this rep writes
    expect(prompts[0]).toContain('Why now: They emailed')
    expect(prompts[0]).toContain('Cheers, Gabriel')
    const task = (await loadTasks([leadId])).find((t) => t.id === draft.taskId)
    expect(task).toMatchObject({ auto: 'follow-up-draft', assigneeId: userId, priority: 'HIGH', done: false })
    // nothing new to say: the next hourly run leaves this contact alone
    expect(await runFollowUpAssistant()).toEqual({ looked: 0, drafted: 0 })
  })

  it('does nothing for a fresh, closed or ownerless conversation', async () => {
    await email('INBOUND', 0.2, 'Quick question')
    expect(await draftFollowUp(leadId)).toBeNull()
    await prisma.emailMessage.deleteMany()
    await email('INBOUND', 3, 'Quick question')
    await prisma.lead.update({ where: { id: leadId }, data: { status: 'WON' } })
    expect(await draftFollowUp(leadId)).toBeNull()
    await prisma.lead.update({ where: { id: leadId }, data: { status: 'INTERESTED', assignedToId: null } })
    expect(await draftFollowUp(leadId)).toBeNull()
    expect(prompts).toHaveLength(0)
  })

  it('briefs a contact from its history', async () => {
    await email('INBOUND', 2, 'Can you send the quote before Sunday?')
    const b = await briefLead(leadId, 'Asia/Jerusalem')
    expect(b).toMatchObject({ lang: 'en', items: 1, nextStep: 'Send the quote today and confirm Sunday.', decided: ['A demo on Sunday'] })
    expect(prompts[0]).toContain('Can you send the quote before Sunday?')
  })
})
