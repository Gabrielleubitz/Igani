import 'server-only'
import { render } from '@react-email/render'
import { Resend } from 'resend'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { BookingCancelled } from '@/emails/BookingCancelled'
import { BookingConfirmed } from '@/emails/BookingConfirmed'
import { BookingInvite } from '@/emails/BookingInvite'
import { BookingRequested } from '@/emails/BookingRequested'
import { ContactEmail } from '@/emails/ContactEmail'
import { MeetingReminder } from '@/emails/MeetingReminder'
import { NewLeadAlert, type NewLeadAlertProps } from '@/emails/NewLeadAlert'
import { LeadAssigned, type LeadAssignedProps } from '@/emails/LeadAssigned'
import { PendingBooking } from '@/emails/PendingBooking'
import { TaskDigest, type TaskDigestProps } from '@/emails/TaskDigest'
import { TeamInvite } from '@/emails/TeamInvite'
import { appUrl, env } from './env'
import { buildIcs } from './ics'
import { getSetting } from './settings'

let client: Resend | undefined
function resend(): Resend {
  client ??= new Resend(env().RESEND_API_KEY)
  return client
}

/**
 * Dev/QA only: with EMAIL_DRY_RUN=1 (ignored in production) emails are written to .email-outbox/
 * as HTML instead of being sent, so every flow can be clicked through without a Resend key.
 */
const dryRun = (): boolean => process.env.NODE_ENV !== 'production' && process.env.EMAIL_DRY_RUN === '1'

async function send(args: {
  to: string | string[]
  subject: string
  html: string
  text: string
  replyTo?: string
  attachments?: { filename: string; content: Buffer; contentType?: string }[]
}): Promise<string> {
  if (dryRun()) {
    const id = `dry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const dir = join(process.cwd(), '.email-outbox')
    mkdirSync(dir, { recursive: true })
    const meta = `<!-- to: ${[args.to].flat().join(', ')} | subject: ${args.subject} | replyTo: ${args.replyTo ?? ''} | attachments: ${(args.attachments ?? []).map((a) => a.filename).join(', ')} -->\n`
    writeFileSync(join(dir, `${id}.html`), meta + args.html)
    console.info(`[email:dry-run] ${args.subject} → ${[args.to].flat().join(', ')} (${id})`)
    return id
  }
  const { data, error } = await resend().emails.send({
    from: env().EMAIL_FROM,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
    replyTo: args.replyTo,
    attachments: args.attachments,
  })
  if (error || !data) throw new Error(`Resend failed: ${error?.message ?? 'no response'}`)
  return data.id
}

export interface BookingEmailData {
  bookingId: string
  title: string
  startTime: Date
  endTime: Date
  guestName: string
  guestEmail: string
  hostName: string
  hostEmail: string
  timeZone: string
  notes?: string | null
}

async function brand(): Promise<{ brandName: string; supportEmail: string }> {
  const [brandName, supportEmail] = await Promise.all([getSetting('brand.name'), getSetting('brand.supportEmail')])
  return { brandName, supportEmail }
}

/** Emails render in inboxes, so the logo must be a public https URL (never localhost). */
const PUBLIC_LOGO_URL = 'https://app.igani.co/igani-logo%202.png'
const logoUrl = (): string => {
  const url = appUrl('/igani-logo%202.png')
  return url.startsWith('https://') && !url.includes('localhost') ? url : PUBLIC_LOGO_URL
}

export async function sendBookingInviteEmail(b: BookingEmailData & { acceptUrl: string }): Promise<string> {
  const element = BookingInvite({ ...b, logoUrl: logoUrl(), ...(await brand()) })
  return send({
    to: b.guestEmail,
    replyTo: b.hostEmail,
    subject: `${b.hostName} invited you: ${b.title}`,
    html: await render(element),
    text: await render(element, { plainText: true }),
  })
}

export async function sendBookingConfirmedEmail(b: BookingEmailData & { meetUrl: string }): Promise<string> {
  const icsFileName = 'igani-meeting.ics'
  const ics = buildIcs({
    uid: `${b.bookingId}@app.igani.co`,
    start: b.startTime,
    end: b.endTime,
    title: b.title,
    description: `Join Google Meet: ${b.meetUrl}`,
    location: b.meetUrl,
    url: b.meetUrl,
    organizerName: b.hostName,
    organizerEmail: b.hostEmail,
    attendeeName: b.guestName,
    attendeeEmail: b.guestEmail,
  })
  const element = BookingConfirmed({ ...b, logoUrl: logoUrl(), icsFileName, ...(await brand()) })
  return send({
    to: b.guestEmail,
    replyTo: b.hostEmail,
    subject: `Confirmed: ${b.title}`,
    html: await render(element),
    text: await render(element, { plainText: true }),
    attachments: [{ filename: icsFileName, content: Buffer.from(ics, 'utf8'), contentType: 'text/calendar; method=REQUEST' }],
  })
}

/** Branded notice to admins that a public booking awaits approval. */
export async function sendApprovalRequestEmail(to: string[], b: BookingEmailData): Promise<string | null> {
  if (to.length === 0) return null
  const element = PendingBooking({ ...b, reviewUrl: appUrl('/admin/bookings'), logoUrl: logoUrl(), ...(await brand()) })
  return send({
    to,
    subject: `Approval needed: ${b.title} with ${b.guestName}`,
    html: await render(element),
    text: await render(element, { plainText: true }),
  })
}

/** Onboarding invite: links to the login page carrying the one-time invite token. */
export async function sendTeamInviteEmail(a: { to: string; role: string; inviterName: string; token: string }): Promise<string> {
  const loginUrl = appUrl(`/login?invite=${encodeURIComponent(a.token)}`)
  const element = TeamInvite({ role: a.role, inviterName: a.inviterName, loginUrl, logoUrl: logoUrl(), ...(await brand()) })
  return send({ to: a.to, subject: 'You are invited to the Igani CRM', html: await render(element), text: await render(element, { plainText: true }) })
}

export async function sendLeadAssignedEmail(to: string, a: Omit<LeadAssignedProps, 'logoUrl' | 'brandName' | 'supportEmail'>): Promise<string> {
  const element = LeadAssigned({ ...a, logoUrl: logoUrl(), ...(await brand()) })
  return send({ to, subject: `New lead assigned: ${a.leadName}`, html: await render(element), text: await render(element, { plainText: true }) })
}

export async function sendTaskDigestEmail(to: string, a: Omit<TaskDigestProps, 'logoUrl' | 'brandName' | 'supportEmail'>): Promise<string> {
  const element = TaskDigest({ ...a, logoUrl: logoUrl(), ...(await brand()) })
  const n = a.tasks.length
  return send({ to, subject: `${n} CRM task${n === 1 ? '' : 's'} need attention`, html: await render(element), text: await render(element, { plainText: true }) })
}

/** Guest notice that a meeting was cancelled, or that an approval request was declined. */
export async function sendBookingCancelledEmail(b: BookingEmailData & { kind: 'cancelled' | 'declined'; rebookUrl?: string | null }): Promise<string> {
  const element = BookingCancelled({ ...b, logoUrl: logoUrl(), ...(await brand()) })
  return send({
    to: b.guestEmail,
    replyTo: b.hostEmail,
    subject: b.kind === 'declined' ? `Update on your request: ${b.title}` : `Cancelled: ${b.title}`,
    html: await render(element),
    text: await render(element, { plainText: true }),
  })
}

/** Guest receipt for a booking that waits for approval. */
export async function sendBookingRequestedEmail(b: BookingEmailData): Promise<string> {
  const element = BookingRequested({ ...b, logoUrl: logoUrl(), ...(await brand()) })
  return send({ to: b.guestEmail, replyTo: b.hostEmail, subject: `Request received: ${b.title}`, html: await render(element), text: await render(element, { plainText: true }) })
}

/** Guest reminder ~24h before a confirmed meeting (sent by the hourly cron). */
export async function sendMeetingReminderEmail(b: BookingEmailData & { meetUrl: string | null }): Promise<string> {
  const element = MeetingReminder({ ...b, logoUrl: logoUrl(), ...(await brand()) })
  return send({ to: b.guestEmail, replyTo: b.hostEmail, subject: `Reminder: ${b.title} is coming up`, html: await render(element), text: await render(element, { plainText: true }) })
}

/** Team alert for a brand-new inbound lead. */
export async function sendNewLeadAlertEmail(to: string[], a: Omit<NewLeadAlertProps, 'logoUrl' | 'brandName' | 'supportEmail'>): Promise<string | null> {
  if (to.length === 0) return null
  const element = NewLeadAlert({ ...a, logoUrl: logoUrl(), ...(await brand()) })
  return send({ to, subject: `New lead: ${a.leadName}${a.company ? ` (${a.company})` : ''}`, html: await render(element), text: await render(element, { plainText: true }) })
}

/** A personal, branded email from a teammate to a contact. Replies go straight to the teammate. */
export async function sendContactEmail(a: { to: string; subject: string; body: string; firstName: string | null; senderName: string; senderEmail: string; cta?: { label: string; href: string } }): Promise<string> {
  const element = ContactEmail({ subject: a.subject, body: a.body, senderName: a.senderName, senderEmail: a.senderEmail, cta: a.cta, logoUrl: logoUrl(), ...(await brand()) })
  return send({ to: a.to, replyTo: a.senderEmail, subject: a.subject, html: await render(element), text: await render(element, { plainText: true }) })
}
