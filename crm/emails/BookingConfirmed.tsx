import * as React from 'react'
import { MeetingCard, Quote, Shell, Steps } from './Shell'
import { formatWhen, googleCalendarUrl, outlookCalendarUrl } from './theme'

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

export function BookingConfirmed({ guestName, hostName, title, startTime, endTime, timeZone, meetUrl, logoUrl, brandName = 'Igani', supportEmail, icsFileName, notes }: BookingConfirmedProps): React.ReactElement {
  const w = formatWhen(startTime, endTime, timeZone)
  const cal = { title, start: startTime, end: endTime, details: `Join Google Meet: ${meetUrl}`, location: meetUrl }
  return (
    <Shell
      preview={`You're booked: ${title}, ${w.date} at ${w.time}`}
      eyebrow="Confirmed"
      tone="success"
      icon="✓"
      title="You're all set!"
      intro={<>Hi {guestName}, your meeting with {hostName} is confirmed. See you there.</>}
      logoUrl={logoUrl}
      brandName={brandName}
      supportEmail={supportEmail}
      cta={{ href: meetUrl, label: 'Join Google Meet' }}
      links={[
        { href: googleCalendarUrl(cal), label: 'Google Calendar' },
        { href: outlookCalendarUrl(cal), label: 'Outlook' },
      ]}
      ctaHint={icsFileName ? `Apple Calendar or desktop Outlook? Open the attached ${icsFileName}. Meet link: ${meetUrl}` : `Meet link: ${meetUrl}`}
      footerNote={`You booked a meeting with ${brandName}. Need to change it? Reply to this email.`}
    >
      <MeetingCard month={w.month} day={w.day} weekday={w.weekday} title={title} time={w.time} tone="success" rows={[{ label: 'With', value: `${hostName}, ${brandName}` }, { label: 'Where', value: 'Google Meet (link below)' }]} />
      {notes ? <Quote label="Your note">{notes}</Quote> : null}
      <Steps
        title="Before the call"
        steps={[
          { title: 'Join a minute early', body: 'Open the Meet link from a laptop or phone, no installs needed.' },
          { title: 'Bring examples', body: 'Sites you like, your current one, and any goals or deadlines.' },
        ]}
      />
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
