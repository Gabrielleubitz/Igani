import { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
Object.assign(process.env, {
  NEXTAUTH_SECRET: 'test-secret-test-secret-test-secret',
  GOOGLE_CLIENT_ID: 'id',
  GOOGLE_CLIENT_SECRET: 'secret',
  RESEND_API_KEY: 're_test',
  EMAIL_FROM: 'Igani <bookings@igani.co>',
  LEAD_WEBHOOK_SECRET: 'webhook-secret-webhook-secret',
  NEXT_PUBLIC_APP_URL: 'https://app.igani.co',
})

let who: { id: string; role: string } | null = null
vi.mock('@/lib/auth', () => ({ currentUserOrNull: async () => who }))

const d = testDb ? describe : describe.skip

d('client documents: who can add and open them', async () => {
  const upload = await import('@/app/api/leads/[id]/documents/route')
  const download = await import('@/app/api/lead-documents/[id]/route')
  const prisma = new PrismaClient()
  let admin = ''
  let ann = ''
  let bo = ''
  let annLead = ''
  beforeEach(async () => {
    await prisma.activityLog.deleteMany()
    await prisma.leadDocument.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    admin = (await prisma.user.create({ data: { email: 'a@igani.co', role: 'ADMIN' } })).id
    ann = (await prisma.user.create({ data: { email: 'ann@igani.co', role: 'SALES' } })).id
    bo = (await prisma.user.create({ data: { email: 'bo@igani.co', role: 'SALES' } })).id
    annLead = (await prisma.lead.create({ data: { email: 'client@x.com', assignedToId: ann } })).id
    who = null
  })
  afterAll(async () => prisma.$disconnect())

  const post = (leadId: string, file: File): Promise<Response> => {
    const form = new FormData()
    form.set('title', 'Brief')
    form.set('file', file)
    return upload.POST(new NextRequest(`http://localhost/api/leads/${leadId}/documents`, { method: 'POST', body: form }), { params: { id: leadId } })
  }
  const get = (id: string): Promise<Response> => download.GET(new NextRequest(`http://localhost/api/lead-documents/${id}`), { params: { id } })
  const pdf = (): File => new File([new Uint8Array([37, 80, 68, 70, 45])], 'brief.pdf', { type: 'application/pdf' })

  it('the salesperson who owns the lead, and admins, can add a document; nobody else can', async () => {
    who = { id: ann, role: 'SALES' }
    expect((await post(annLead, pdf())).status).toBe(201)
    who = { id: admin, role: 'ADMIN' }
    expect((await post(annLead, pdf())).status).toBe(201)
    who = { id: bo, role: 'SALES' }
    expect((await post(annLead, pdf())).status).toBe(404)
    who = null
    expect((await post(annLead, pdf())).status).toBe(401)
    expect(await prisma.leadDocument.count({ where: { leadId: annLead } })).toBe(2)
    expect(await prisma.activityLog.count({ where: { action: 'document.added', entityId: annLead } })).toBe(2)
  })

  it('refuses unsupported files', async () => {
    who = { id: ann, role: 'SALES' }
    expect((await post(annLead, new File(['x'], 'run.exe', { type: 'application/x-msdownload' }))).status).toBe(400)
  })

  it('downloads follow the same visibility as the lead', async () => {
    who = { id: ann, role: 'SALES' }
    await post(annLead, pdf())
    const { id } = await prisma.leadDocument.findFirstOrThrow({ where: { leadId: annLead }, select: { id: true } })
    expect((await get(id)).status).toBe(200)
    who = { id: admin, role: 'ADMIN' }
    const res = await get(id)
    expect(res.status).toBe(200)
    expect(Buffer.from(await res.arrayBuffer()).toString()).toBe('%PDF-')
    who = { id: bo, role: 'SALES' }
    expect((await get(id)).status).toBe(404)
    who = null
    expect((await get(id)).status).toBe(401)
  })

  it('an unassigned lead is the admins’ only', async () => {
    const free = (await prisma.lead.create({ data: { email: 'free@x.com' } })).id
    who = { id: ann, role: 'SALES' }
    expect((await post(free, pdf())).status).toBe(404)
    who = { id: admin, role: 'ADMIN' }
    expect((await post(free, pdf())).status).toBe(201)
  })
})
