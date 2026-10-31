import { Text } from '@react-email/components'
import * as React from 'react'
import { DetailCard, p, Quote, Shell } from './Shell'
import { formatWhen, googleCalendarUrl } from './theme'

export interface BookingConfirmedProps {
  guestName: string
  hostName: string
  title: string
  startTime: Date
  endTime: Date
  /** IANA zone used to display the time, e.g. "Asia/Jerusalem" */
  timeZone: string
  meetUrl: string
  /** Absolute URL of the Igani logo (dark wordmark) */
  logoUrl: string
  brandName?: string
  supportEmail?: string
  /** Set when an .ics file is attached to the email; shows the "add to calendar" hint */
  icsFileName?: string
  notes?: string | null
}

export function BookingConfirmed({
  guestName,
  hostName,
  title,
  startTime,
  endTime,
  timeZone,
  meetUrl,
  logoUrl,
  brandName = 'Igani',
  supportEmail,
  icsFileName,
  notes,
}: BookingConfirmedProps): React.ReactElement {
  const when = formatWhen(startTime, endTime, timeZone)
  return (
    <Shell
      preview={`Confirmed: ${title} — ${when.date}`}
      eyebrow="Meeting confirmed"
      tone="success"
      title={title}
      logoUrl={logoUrl}
      brandName={brandName}
      supportEmail={supportEmail}
      cta={{ href: meetUrl, label: 'Join Google Meet' }}
      secondary={{ href: googleCalendarUrl({ title, start: startTime, end: endTime, details: `Join Google Meet: ${meetUrl}`, location: meetUrl }), label: 'Add to Google Calendar' }}
      ctaHint={icsFileName ? `Using Outlook or Apple Calendar? Open the attached ${icsFileName} file. Meet link: ${meetUrl}` : `Meet link: ${meetUrl}`}
    >
      <Text style={p}>Hi {guestName}, you&apos;re booked with {hostName} from {brandName}. Here are the details:</Text>
      <DetailCard rows={[{ label: 'Date', value: when.date }, { label: 'Time', value: when.time }, { label: 'Host', value: hostName }, { label: 'Where', value: 'Google Meet (link below)' }]} />
      {notes ? <Quote>{notes}</Quote> : null}
    </Shell>
  )
}

BookingConfirmed.PreviewProps = {
  guestName: 'Dana',
  hostName: 'Gabriel',
  title: 'Igani intro call',
  startTime: new Date('2026-11-02T09:00:00Z'),
  endTime: new Date('2026-11-02T09:30:00Z'),
  timeZone: 'Asia/Jerusalem',
  meetUrl: 'https://meet.google.com/abc-defg-hij',
  logoUrl: 'https://app.igani.co/igani-logo%202.png',
  icsFileName: 'igani-meeting.ics',
} satisfies BookingConfirmedProps

export default BookingConfirmed
