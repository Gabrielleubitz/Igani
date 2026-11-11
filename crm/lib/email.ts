import 'server-only'
import { avatarEmailUrlFor } from './avatar'
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
import { MeetInvite, meetInviteText } from '@/emails/MeetInvite'
import { NewLeadAlert, type NewLeadAlertProps } from '@/emails/NewLeadAlert'
import { OfferSigned, type OfferSignedProps } from '@/emails/OfferSigned'
import { LeadAssigned, type LeadAssignedProps } from '@/emails/LeadAssigned'
import { PendingBooking } from '@/emails/PendingBooking'
import { SalesContractSigned, type SalesContractSignedProps } from '@/emails/SalesContractSigned'
import { TaskDigest, type TaskDigestProps } from '@/emails/TaskDigest'
import { TeamInvite } from '@/emails/TeamInvite'
import { WeeklySummary, type WeeklySummaryProps } from '@/emails/WeeklySummary'
import { appUrl, env } from './env'
import { buildIcs } from './ics'
import { newLeadSubject } from './lead-alerts'
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
  headers?: Record<string, string>
  /** sender's display name, on our own address (e.g. "Gabriel Leubitz (Igani)") */
  fromName?: string
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
    from: args.fromName ? withFromName(env().EMAIL_FROM, args.fromName) : env().EMAIL_FROM,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
    replyTo: args.replyTo,
    attachments: args.attachments,
    headers: args.headers,
  })
  if (error || !data) throw new Error(`Resend failed: ${error?.message ?? 'no response'}`)
  return data.id
}

/** "Igani <bookings@igani.co>" + "Dana (Igani)" → "Dana (Igani) <bookings@igani.co>"; the address never changes. */
export function withFromName(from: string, name: string): string {
  const addr = /<([^<>]+)>/.exec(from)?.[1] ?? from.trim()
  const clean = name.replace(/["<>\r\n]/g, '').trim().slice(0, 70)
  return clean ? `"${clean}" <${addr}>` : from
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
  const element = BookingInvite({ ...b, hostPhotoUrl: await avatarEmailUrlFor(b.hostEmail), logoUrl: logoUrl(), ...(await brand()) })
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

/** Sent to teammates added to a meeting: the Meet link and time, nothing to approve. */
export async function sendTeammateMeetingEmail(b: BookingEmailData & { meetUrl: string; teammateEmail: string; teammateName: string }): Promise<string> {
  const icsFileName = 'igani-meeting.ics'
  const ics = buildIcs({
    uid: `${b.bookingId}-${b.teammateEmail}@app.igani.co`,
    start: b.startTime,
    end: b.endTime,
    title: b.title,
    description: `Join Google Meet: ${b.meetUrl}`,
    location: b.meetUrl,
    url: b.meetUrl,
    organizerName: b.hostName,
    organizerEmail: b.hostEmail,
    attendeeName: b.teammateName,
    attendeeEmail: b.teammateEmail,
  })
  const element = BookingConfirmed({ ...b, guestName: b.teammateName, meetUrl: b.meetUrl, logoUrl: logoUrl(), icsFileName, teammateOf: { guestName: b.guestName }, ...(await brand()) })
  return send({
    to: b.teammateEmail,
    replyTo: b.hostEmail,
    subject: `You're on the call: ${b.title} with ${b.guestName}`,
    html: await render(element),
    text: await render(element, { plainText: true }),
    attachments: [{ filename: icsFileName, content: Buffer.from(ics, 'utf8'), contentType: 'text/calendar; method=REQUEST' }],
  })
}

/** Branded notice to admins that a public booking awaits approval. */
export async function sendApprovalRequestEmail(to: string[], b: BookingEmailData, opts: { teamRequest?: boolean } = {}): Promise<string | null> {
  if (to.length === 0) return null
  const element = PendingBooking({ ...b, teamRequest: opts.teamRequest, reviewUrl: appUrl(opts.teamRequest ? '/sales' : '/admin/bookings'), logoUrl: logoUrl(), ...(await brand()) })
  return send({
    to,
    subject: opts.teamRequest ? `Team meeting request from ${b.hostName}: ${b.title}` : `Approval needed: ${b.title} with ${b.guestName}`,
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

/** Sunday summary for one admin. */
export async function sendWeeklySummaryEmail(to: string, a: Omit<WeeklySummaryProps, 'logoUrl' | 'brandName' | 'supportEmail'>, subject: string): Promise<string> {
  const element = WeeklySummary({ ...a, logoUrl: logoUrl(), ...(await brand()) })
  return send({ to, subject, html: await render(element), text: await render(element, { plainText: true }) })
}

/** Guest notice that a meeting was cancelled, or that an approval request was declined. */
export async function sendBookingCancelledEmail(b: BookingEmailData & { kind: 'cancelled' | 'declined'; rebookUrl?: string | null; removeFromCalendar?: boolean }): Promise<string> {
  const element = BookingCancelled({ ...b, hostPhotoUrl: await avatarEmailUrlFor(b.hostEmail), logoUrl: logoUrl(), ...(await brand()) })
  // A confirmed meeting was sent with an .ics invite: a METHOD:CANCEL file with the same UID removes it from their calendar.
  const ics = b.removeFromCalendar
    ? buildIcs({ uid: `${b.bookingId}@app.igani.co`, start: b.startTime, end: b.endTime, title: b.title, organizerName: b.hostName, organizerEmail: b.hostEmail, attendeeName: b.guestName, attendeeEmail: b.guestEmail, method: 'CANCEL' })
    : null
  return send({
    attachments: ics ? [{ filename: 'igani-meeting-cancelled.ics', content: Buffer.from(ics, 'utf8'), contentType: 'text/calendar; method=CANCEL' }] : undefined,
    to: b.guestEmail,
    replyTo: b.hostEmail,
    subject: b.kind === 'declined' ? `Update on your request: ${b.title}` : `Cancelled: ${b.title}`,
    html: await render(element),
    text: await render(element, { plainText: true }),
  })
}

/** Guest receipt for a booking that waits for approval. */
export async function sendBookingRequestedEmail(b: BookingEmailData): Promise<string> {
  const element = BookingRequested({ ...b, hostPhotoUrl: await avatarEmailUrlFor(b.hostEmail), logoUrl: logoUrl(), ...(await brand()) })
  return send({ to: b.guestEmail, replyTo: b.hostEmail, subject: `Request received: ${b.title}`, html: await render(element), text: await render(element, { plainText: true }) })
}

/** Guest reminder ~24h before a confirmed meeting. The hourly cron only drafts it; it goes out when the host approves it on Today. */
export async function sendMeetingReminderEmail(b: BookingEmailData & { meetUrl: string | null }): Promise<string> {
  const element = MeetingReminder({ ...b, hostPhotoUrl: await avatarEmailUrlFor(b.hostEmail), logoUrl: logoUrl(), ...(await brand()) })
  return send({ to: b.guestEmail, replyTo: b.hostEmail, subject: `Reminder: ${b.title} is coming up`, html: await render(element), text: await render(element, { plainText: true }) })
}

/** Team alert for a brand-new inbound lead. */
export async function sendNewLeadAlertEmail(to: string[], a: Omit<NewLeadAlertProps, 'logoUrl' | 'brandName' | 'supportEmail'>): Promise<string | null> {
  if (to.length === 0) return null
  const element = NewLeadAlert({ ...a, logoUrl: logoUrl(), ...(await brand()) })
  return send({ to, subject: newLeadSubject(a), html: await render(element), text: await render(element, { plainText: true }) })
}

/** A personal, branded email from a teammate to a contact. Replies go straight to the teammate. */
export async function sendContactEmail(a: {
  to: string
  subject: string
  body: string
  firstName: string | null
  senderName: string
  senderEmail: string
  /** the sender's photo for the signature */
  senderPhotoUrl?: string | null
  cta?: { label: string; href: string }
  /** Email language (default English) */
  lang?: 'en' | 'he'
  /** When replying: the original email, quoted under the message and threaded via In-Reply-To/References */
  inReplyTo?: { messageIdHeader: string | null; quote: { from: string; sentAt: string; text: string } }
}): Promise<string> {
  const element = ContactEmail({ subject: a.subject, body: a.body, senderName: a.senderName, senderEmail: a.senderEmail, senderPhotoUrl: a.senderPhotoUrl, cta: a.cta, quote: a.inReplyTo?.quote, lang: a.lang, logoUrl: logoUrl(), ...(await brand()) })
  const mid = a.inReplyTo?.messageIdHeader
  return send({
    to: a.to,
    replyTo: a.senderEmail,
    subject: a.subject,
    html: await render(element),
    text: await render(element, { plainText: true }),
    headers: mid ? { 'In-Reply-To': mid, References: mid } : undefined,
  })
}

/** Signed offer: the client's receipt and the team alert, each with the signed PDF attached. */
export async function sendOfferSignedEmail(
  to: string | string[],
  a: Omit<OfferSignedProps, 'logoUrl' | 'brandName' | 'supportEmail'>,
  pdf: { filename: string; content: Buffer },
): Promise<string> {
  const element = OfferSigned({ ...a, logoUrl: logoUrl(), ...(await brand()) })
  const subject = a.audience === 'team' ? `Signed: ${a.offerTitle} (${a.clientName})` : a.lang === 'he' ? `ההסכם נחתם: ${a.offerTitle}` : `Signed: ${a.offerTitle}`
  return send({ to, subject, html: await render(element), text: await render(element, { plainText: true }), attachments: [{ ...pdf, contentType: 'application/pdf' }] })
}

/** Signed salesman commission agreement: the PDF goes to the salesman and the creating admin, nothing is stored. */
export async function sendSalesContractSignedEmail(
  to: string,
  a: Omit<SalesContractSignedProps, 'logoUrl' | 'brandName' | 'supportEmail'>,
  pdf: { filename: string; content: Buffer },
): Promise<string> {
  const element = SalesContractSigned({ ...a, logoUrl: logoUrl(), ...(await brand()) })
  const subject = a.audience === 'admin' ? `Signed: sales commission agreement (${a.repName})` : 'Signed: your Igani sales commission agreement'
  return send({ to, subject, html: await render(element), text: await render(element, { plainText: true }), attachments: [{ ...pdf, contentType: 'application/pdf' }] })
}

/** Igani Meet invite: the personal join link, with a calendar entry when the call has a time. */
export async function sendMeetInviteEmail(a: { to: string; guestName: string | null; title: string; hostName: string; hostEmail: string; joinUrl: string; start: Date | null; durationMin: number; timeZone: string; uid: string }): Promise<string> {
  const when = a.start ? new Intl.DateTimeFormat('en-US', { timeZone: a.timeZone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(a.start) : null
  const { brandName } = await brand()
  const props = { title: a.title, hostName: a.hostName, guestName: a.guestName, joinUrl: a.joinUrl, when, hostPhotoUrl: await avatarEmailUrlFor(a.hostEmail), logoUrl: logoUrl(), brandName }
  // a scheduled call is a real calendar invitation (Gmail shows it with Yes/No and files it in the main inbox)
  const ics = a.start
    ? buildIcs({ uid: `${a.uid}@app.igani.co`, start: a.start, end: new Date(a.start.getTime() + a.durationMin * 60_000), title: a.title, description: `Join on ${brandName} Meet: ${a.joinUrl}`, location: a.joinUrl, url: a.joinUrl, organizerName: a.hostName, organizerEmail: a.hostEmail, attendeeName: a.guestName ?? a.to, attendeeEmail: a.to })
    : null
  const mail = {
    to: a.to,
    fromName: `${a.hostName} (${brandName})`,
    replyTo: a.hostEmail,
    subject: when ? `Invitation: ${a.title} @ ${when}` : `Video call with ${a.hostName}: ${a.title}`,
    html: await render(MeetInvite(props)),
    text: meetInviteText(props),
  }
  if (!ics) return send(mail)
  try {
    return await send({ ...mail, attachments: [{ filename: 'invite.ics', content: Buffer.from(ics, 'utf8'), contentType: 'text/calendar; charset=utf-8; method=REQUEST' }] })
  } catch (err) {
    // Resend once refused an invite ("Invalid option"): the link matters more than the calendar file, so send it without
    console.warn('[meet] invite with calendar file refused, sending without it', a.to, err instanceof Error ? err.message : err)
    return send(mail)
  }
}
