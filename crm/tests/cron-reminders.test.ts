import { afterEach, describe, expect, it, vi } from 'vitest'
import { isPublicPath } from '@/lib/roles'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

describe('task reminder cron auth', () => {
  afterEach(() => vi.unstubAllEnvs())
  const url = 'http://x/api/public/cron/task-reminders'

  it('is reachable without a session', () => {
    expect(isPublicPath('/api/public/cron/task-reminders')).toBe(true)
  })
  it('401 with no secret configured, none sent, or wrong one', async () => {
    const { GET } = await import('@/app/api/public/cron/task-reminders/route')
    vi.stubEnv('CRON_SECRET', '')
    expect((await GET(new Request(url, { headers: { authorization: 'Bearer ' } }))).status).toBe(401)
    vi.stubEnv('CRON_SECRET', 'right-secret-123456')
    expect((await GET(new Request(url))).status).toBe(401)
    expect((await GET(new Request(url, { headers: { authorization: 'Bearer wrong-secret-1234567' } }))).status).toBe(401)
  })
})
