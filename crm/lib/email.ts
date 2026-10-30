import 'server-only'
import { render } from '@react-email/render'
import { Resend } from 'resend'
import { BookingConfirmed } from '@/emails/BookingConfirmed'
import { BookingInvite } from '@/emails/BookingInvite'
import { appUrl, env } from './env'
import { buildIcs } from './ics'

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

const logoUrl = (): string => appUrl('/igani-logo.png')

export async function sendBookingInviteEmail(b: BookingEmailData & { acceptUrl: string }): Promise<string> {
  const element = BookingInvite({ ...b, logoUrl: logoUrl() })
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
  const element = BookingConfirmed({ ...b, logoUrl: logoUrl(), icsFileName })
  return send({
    to: b.guestEmail,
    replyTo: b.hostEmail,
    subject: `Confirmed: ${b.title}`,
    html: await render(element),
    text: await render(element, { plainText: true }),
    attachments: [{ filename: icsFileName, content: Buffer.from(ics, 'utf8'), contentType: 'text/calendar; method=REQUEST' }],
  })
}

/** Plain notice to admins that a public booking awaits approval. */
export async function sendApprovalRequestEmail(to: string[], b: BookingEmailData): Promise<string | null> {
  if (to.length === 0) return null
  const link = appUrl('/admin/bookings')
  const when = b.startTime.toISOString()
  return send({
    to,
    subject: `Approval needed: ${b.title} with ${b.guestName}`,
    text: `${b.guestName} <${b.guestEmail}> requested "${b.title}" with ${b.hostName} at ${when}.\n\nReview: ${link}`,
    html: `<p><strong>${escapeHtml(b.guestName)}</strong> (${escapeHtml(b.guestEmail)}) requested <strong>${escapeHtml(b.title)}</strong> with ${escapeHtml(b.hostName)} at ${when}.</p><p><a href="${link}">Review pending bookings</a></p>`,
  })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)
}
