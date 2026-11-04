import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
// Google is never asked
vi.mock('@/lib/google', async (orig) => ({ ...(await orig<typeof import('@/lib/google')>()), googleGetter: async () => { throw new Error('not connected') } }))

const d = testDb ? describe : describe.skip
const PHOTO = 'https://lh3.googleusercontent.com/a/ACg8ocKabc=s96-c'
const jwt = (claims: object): string => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.sig`

d('photo without signing in again', async () => {
  const { ensureAvatar, forgetDeadAvatar } = await import('@/lib/avatar-sync')
  const prisma = new PrismaClient()
  let userId = ''
  const clean = async (): Promise<void> => {
    await prisma.siteSetting.deleteMany({ where: { key: { startsWith: 'avatar.' } } })
    await prisma.call.deleteMany()
    await prisma.phoneLine.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.account.deleteMany()
    await prisma.user.deleteMany()
  }
  beforeEach(async () => {
    await clean()
    userId = (await prisma.user.create({ data: { email: 'g@igani.co', role: 'ADMIN' } })).id
    await prisma.account.create({ data: { userId, type: 'oauth', provider: 'google', providerAccountId: '123', id_token: jwt({ picture: PHOTO }) } })
  })
  afterAll(async () => {
    await clean()
    await prisma.$disconnect()
  })

  it('finds it in the stored sign-in token and saves it', async () => {
    expect(await ensureAvatar(userId)).toBe(PHOTO)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).image).toBe(PHOTO)
  })

  it('a photo Google stopped serving is forgotten and never reused', async () => {
    await ensureAvatar(userId)
    await forgetDeadAvatar(userId, PHOTO)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).image).toBeNull()
    expect(await ensureAvatar(userId)).toBeNull() // the token only has the dead one; Google isn't connected
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).image).toBeNull()
  })
})
