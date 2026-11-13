import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
Object.assign(process.env, { NEXTAUTH_SECRET: 'test-secret-test-secret-test-secret', NEXT_PUBLIC_APP_URL: 'https://app.igani.co', INSTAGRAM_APP_ID: 'app', INSTAGRAM_APP_SECRET: 'ig-secret', INSTAGRAM_WEBHOOK_VERIFY_TOKEN: 'verify-token-123456' })

describe('Instagram DMs', async () => {
  const dm = await import('@/lib/instagram-dm')
  const reels = [
    { id: 'r1', title: 'The Ghost Army', caption: 'Your website is your tank.\n\nDM us "SITE" and we\'ll tell you what yours says.' },
    { id: 'r2', title: 'The Great Emu War', caption: 'DM us “SYSTEM” and we’ll show you where yours is leaking.' },
    { id: 'r3', title: 'Bubble wrap', caption: 'DM us the word POP — no quotes here' },
  ]
  it('reads the DM word from each reel caption', () => {
    expect(dm.ctaWord(reels[0]!.caption)).toBe('SITE')
    expect(dm.ctaWord(reels[1]!.caption)).toBe('SYSTEM')
    expect(dm.ctaWord('no ask here')).toBeNull()
  })
  it('ties a DM to the reel whose word it uses, as a whole word', () => {
    expect(dm.matchReel('hey! SYSTEM please', reels)).toMatchObject({ reelId: 'r2', keyword: 'SYSTEM' })
    expect(dm.matchReel('site', reels)).toMatchObject({ reelId: 'r1' })
    expect(dm.matchReel('my website is slow', reels)).toBeNull()
  })
  it('accepts only webhooks signed with the app secret, and only the right verify token', () => {
    const body = '{"object":"instagram"}'
    const sig = 'sha256=' + createHmac('sha256', 'ig-secret').update(body).digest('hex')
    expect(dm.webhookSignatureOk(body, sig)).toBe(true)
    expect(dm.webhookSignatureOk(body + ' ', sig)).toBe(false)
    expect(dm.webhookSignatureOk(body, null)).toBe(false)
    expect(dm.verifyTokenOk('verify-token-123456')).toBe(true)
    expect(dm.verifyTokenOk('nope')).toBe(false)
  })
})
