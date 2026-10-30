// Usage: npx tsx scripts/send-test-email.mts [to@address]
// Renders the real BookingConfirmed template with sample data and sends it via Resend.
import { render } from '@react-email/render'
import { readFileSync } from 'node:fs'
import { Resend } from 'resend'
import { BookingConfirmed } from '../emails/BookingConfirmed.tsx'

const env: Record<string, string> = { ...process.env } as Record<string, string>
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line)
  if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^"|"$/g, '')
}

const to = process.argv[2] ?? 'gabrielleubitz@igani.co'
const startTime = new Date(Date.now() + 86_400_000)
const element = BookingConfirmed({
  guestName: 'Gabriel',
  hostName: 'Igani Team',
  title: 'Test: Igani intro call',
  startTime,
  endTime: new Date(+startTime + 1_800_000),
  timeZone: 'Asia/Jerusalem',
  meetUrl: 'https://meet.google.com/test-test-test',
  logoUrl: 'https://app.igani.co/igani-logo%202.png',
  brandName: 'Igani',
  supportEmail: 'support@igani.co',
  notes: 'This is a test email.',
})
const { data, error } = await new Resend(env.RESEND_API_KEY).emails.send({
  from: env.EMAIL_FROM,
  to,
  subject: '[TEST] Confirmed: Igani intro call',
  html: await render(element),
  text: await render(element, { plainText: true }),
})
if (error || !data) throw new Error(`Resend failed: ${error?.message ?? 'no response'}`)
console.log(`Sent ${data.id} to ${to}`)
