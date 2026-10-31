import * as React from 'react'
import { MeetingCard, Shell } from './Shell'
import { formatWhen, googleCalendarUrl, outlookCalendarUrl } from './theme'

export interface MeetingReminderProps {
  guestName: string
  hostName: string
  title: string
  startTime: Date
  endTime: Date
  timeZone: string
  meetUrl: string | null
  logoUrl: string
  brandName?: string
  supportEmail?: string
}

/** Sent to the guest about a day before a confirmed meeting. */
export function MeetingReminder({ guestName, hostName, title, startTime, endTime, timeZone, meetUrl, logoUrl, brandName = 'Igani', supportEmail }: MeetingReminderProps): React.ReactElement {
  const w = formatWhen(startTime, endTime, timeZone)
  const cal = { title, start: startTime, end: endTime, details: meetUrl ? `Join Google Meet: ${meetUrl}` : undefined, location: meetUrl ?? undefined }
  return (
    <Shell
      preview={`Tomorrow: ${title} at ${w.time}`}
      eyebrow="Coming up"
      tone="warning"
      icon="⏰"
      title={`See you soon, ${guestName}`}
      intro={<>A quick reminder about your meeting with {hostName}.</>}
      logoUrl={logoUrl}
      brandName={brandName}
      supportEmail={supportEmail}
      cta={meetUrl ? { href: meetUrl, label: 'Join Google Meet' } : undefined}
      links={[
        { href: googleCalendarUrl(cal), label: 'Google Calendar' },
        { href: outlookCalendarUrl(cal), label: 'Outlook' },
      ]}
      ctaHint="Need to change the time? Reply to this email and we'll sort it out."
      signature={{ name: hostName, detail: brandName }}
      footerNote={`You have a meeting booked with ${brandName}.`}
    >
      <MeetingCard month={w.month} day={w.day} weekday={w.weekday} title={title} time={w.time} tone="warning" rows={[{ label: 'With', value: `${hostName}, ${brandName}` }, { label: 'Where', value: 'Google Meet' }]} />
    </Shell>
  )
}

export default MeetingReminder
