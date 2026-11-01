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

d('agreements: upload and download permissions', async () => {
  const upload = await import('@/app/api/admin/agreements/route')
  const download = await import('@/app/api/agreements/[id]/route')
  const prisma = new PrismaClient()
  let admin = ''
  let ann = ''
  let bo = ''
  beforeEach(async () => {
    await prisma.activityLog.deleteMany()
    await prisma.agreement.deleteMany()
    await prisma.user.deleteMany()
    admin = (await prisma.user.create({ data: { email: 'a@igani.co', role: 'ADMIN' } })).id
    ann = (await prisma.user.create({ data: { email: 'ann@igani.co', role: 'SALES' } })).id
    bo = (await prisma.user.create({ data: { email: 'bo@igani.co', role: 'SALES' } })).id
    who = null
  })
  afterAll(async () => prisma.$disconnect())

  const post = (userId: string, file: File, title = ''): Promise<Response> => {
    const form = new FormData()
    form.set('userId', userId)
    form.set('title', title)
    form.set('file', file)
    return upload.POST(new NextRequest('http://localhost/api/admin/agreements', { method: 'POST', body: form }))
  }
  const get = (id: string): Promise<Response> => download.GET(new NextRequest(`http://localhost/api/agreements/${id}`), { params: { id } })
  const pdf = (): File => new File([new Uint8Array([37, 80, 68, 70, 45])], 'Commission agreement.pdf', { type: 'application/pdf' })

  it('only an admin can upload; the file is stored for that salesperson', async () => {
    who = { id: ann, role: 'SALES' }
    expect((await post(ann, pdf())).status).toBe(403)
    who = null
    expect((await post(ann, pdf())).status).toBe(403)
    who = { id: admin, role: 'ADMIN' }
    const res = await post(ann, pdf(), 'Commission 2026')
    expect(res.status).toBe(201)
    expect(await prisma.agreement.findMany({ where: { userId: ann }, select: { title: true, fileName: true, size: true } })).toEqual([{ title: 'Commission 2026', fileName: 'Commission agreement.pdf', size: 5 }])
    expect(await prisma.activityLog.count({ where: { action: 'agreement.uploaded', entityId: ann } })).toBe(1)
  })

  it('refuses unsupported or oversized files', async () => {
    who = { id: admin, role: 'ADMIN' }
    expect((await post(ann, new File(['x'], 'run.exe', { type: 'application/x-msdownload' }))).status).toBe(400)
    expect((await post(ann, new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'big.pdf', { type: 'application/pdf' }))).status).toBe(400)
  })

  it('the salesperson can download their own agreement; another salesperson cannot; an admin can', async () => {
    who = { id: admin, role: 'ADMIN' }
    await post(ann, pdf())
    const { id } = await prisma.agreement.findFirstOrThrow({ where: { userId: ann }, select: { id: true } })

    who = { id: ann, role: 'SALES' }
    const mine = await get(id)
    expect(mine.status).toBe(200)
    expect(mine.headers.get('content-type')).toBe('application/pdf')
    expect(Buffer.from(await mine.arrayBuffer()).toString()).toBe('%PDF-')

    who = { id: bo, role: 'SALES' }
    expect((await get(id)).status).toBe(404) // not even a hint that it exists

    who = null
    expect((await get(id)).status).toBe(401)

    who = { id: admin, role: 'ADMIN' }
    expect((await get(id)).status).toBe(200)
  })
})
