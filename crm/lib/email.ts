import 'server-only'
import { render } from '@react-email/render'
import { Resend } from 'resend'
import { BookingConfirmed } from '@/emails/BookingConfirmed'
import { BookingInvite } from '@/emails/BookingInvite'
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

async function send(args: {
  to: string | string[]
  subject: string
  html: string
  text: string
  replyTo?: string
  attachments?: { filename: string; content: Buffer; contentType?: string }[]
}): Promise<string> {
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
