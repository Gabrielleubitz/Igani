import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
Object.assign(process.env, { NEXTAUTH_SECRET: 'test-secret-test-secret-test-secret', TIKTOK_JOB_SECRET: 'job-secret-job-secret-job-secret', NEXT_PUBLIC_APP_URL: 'https://app.igani.co', TIKTOK_CLIENT_KEY: 'ck', TIKTOK_CLIENT_SECRET: 'cs' })

describe('TikTok connection', async () => {
  const t = await import('@/lib/tiktok')
  it('stores tokens encrypted and reads them back', () => {
    const sealed = t.seal('act.secret-token')
    expect(sealed).not.toContain('secret-token')
    expect(t.unseal(sealed)).toBe('act.secret-token')
    const [iv, tag, body] = sealed.split('.')
    expect(() => t.unseal([iv, tag, body!.slice(0, -2) + 'AA'].join('.'))).toThrow()
  })
  it('only lets the reel job in with the exact secret', () => {
    expect(t.jobSecretOk('Bearer job-secret-job-secret-job-secret')).toBe(true)
    expect(t.jobSecretOk('Bearer job-secret-job-secret-job-secreX')).toBe(false)
    expect(t.jobSecretOk('job-secret-job-secret-job-secret')).toBe(false)
    expect(t.jobSecretOk(null)).toBe(false)
  })
  it('sends admins to TikTok with the right scopes and our callback', () => {
    const u = new URL(t.authorizeUrl('st8'))
    expect(u.origin + u.pathname).toBe('https://www.tiktok.com/v2/auth/authorize/')
    expect(u.searchParams.get('scope')).toBe('user.info.basic,video.upload,video.publish')
    expect(u.searchParams.get('redirect_uri')).toBe('https://app.igani.co/api/public/tiktok/callback')
    expect(u.searchParams.get('state')).toBe('st8')
  })
})
