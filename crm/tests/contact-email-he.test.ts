import { mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/settings', () => ({ getSetting: async () => 'Igani' }))
vi.mock('@/lib/env', () => ({ env: () => ({ EMAIL_FROM: 'x@igani.co', RESEND_API_KEY: 'k', SUPPORT_EMAIL: 'hello@igani.co' }), appUrl: () => 'https://app.igani.co' }))

const base = { to: 'c@x.co', subject: 'שלום', body: 'שלום דנה,\n\nתודה על השיחה.', firstName: 'דנה', senderName: 'Gabriel', senderEmail: 'g@igani.co', cta: { label: 'בחר/י זמן', href: 'https://x.co' }, inReplyTo: { messageIdHeader: null, quote: { from: 'Dana', sentAt: '1 Nov', text: 'hi' } } }

async function sent(lang?: 'he' | 'en'): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), 'outbox-'))
  vi.stubEnv('EMAIL_DRY_RUN', '1')
  vi.spyOn(process, 'cwd').mockReturnValue(dir)
  const { sendContactEmail } = await import('@/lib/email')
  await sendContactEmail({ ...base, lang })
  vi.restoreAllMocks()
  vi.unstubAllEnvs() // test files share one process: don't leave dry-run on for the next file
  const f = readdirSync(join(dir, '.email-outbox'))[0]!
  return readFileSync(join(dir, '.email-outbox', f), 'utf8')
}

describe('contact email language reaches the final send', () => {
  it('Hebrew: rtl document, right quote border, left arrow, Hebrew footer + quote label', async () => {
    const html = await sent('he')
    expect(html).toMatch(/<html[^>]*dir="rtl"/)
    expect(html).toMatch(/<html[^>]*lang="he"/)
    expect(html).toContain('border-right:3px solid')
    expect(html).not.toContain('border-left:3px solid')
    expect(html).toContain('←')
    expect(html).toContain('נשלח על ידי Gabriel')
    expect(html).toContain('כתב/ה')
  })
  it('default stays English ltr', async () => {
    const html = await sent()
    expect(html).toMatch(/<html[^>]*dir="ltr"/)
    expect(html).toContain('→')
    expect(html).toContain('Sent by Gabriel')
  })
})
