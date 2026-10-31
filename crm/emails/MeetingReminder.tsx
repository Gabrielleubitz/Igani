import { Text } from '@react-email/components'
import * as React from 'react'
import { DetailCard, p, Shell } from './Shell'
import { formatWhen, googleCalendarUrl } from './theme'

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
  const when = formatWhen(startTime, endTime, timeZone)
  return (
    <Shell
      preview={`Reminder: ${title}, ${when.date} at ${when.time}`}
      eyebrow="Coming up"
      tone="warning"
      title={`See you soon, ${guestName}`}
      logoUrl={logoUrl}
      brandName={brandName}
      supportEmail={supportEmail}
      cta={meetUrl ? { href: meetUrl, label: 'Join Google Meet' } : undefined}
      secondary={{ href: googleCalendarUrl({ title, start: startTime, end: endTime, details: meetUrl ? `Join Google Meet: ${meetUrl}` : undefined, location: meetUrl ?? undefined }), label: 'Add to Google Calendar' }}
      ctaHint="Need to change the time? Just reply to this email and we'll sort it out."
      signature={{ name: hostName, detail: brandName }}
    >
      <Text style={p}>A quick reminder about your upcoming meeting with {hostName}.</Text>
      <DetailCard rows={[{ label: 'Meeting', value: title }, { label: 'Date', value: when.date }, { label: 'Time', value: when.time }, { label: 'Where', value: 'Google Meet' }]} />
    </Shell>
  )
}

export default MeetingReminder
