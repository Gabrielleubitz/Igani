import { Text } from '@react-email/components'
import * as React from 'react'
import { DetailCard, p, Shell } from './Shell'
import { colors, formatWhen } from './theme'

export interface BookingCancelledProps {
  guestName: string
  hostName: string
  title: string
  startTime: Date
  endTime: Date
  timeZone: string
  /** 'declined' = an approval request was not accepted; 'cancelled' = a booked meeting was called off */
  kind: 'cancelled' | 'declined'
  /** Link to pick a new time (the public booking page), if there is one */
  rebookUrl?: string | null
  logoUrl: string
  brandName?: string
  supportEmail?: string
}

export function BookingCancelled({ guestName, hostName, title, startTime, endTime, timeZone, kind, rebookUrl, logoUrl, brandName = 'Igani', supportEmail }: BookingCancelledProps): React.ReactElement {
  const when = formatWhen(startTime, endTime, timeZone)
  const declined = kind === 'declined'
  return (
    <Shell
      preview={declined ? `We couldn't confirm ${title} on ${when.date}` : `Cancelled: ${title} on ${when.date}`}
      eyebrow={declined ? 'Request not confirmed' : 'Meeting cancelled'}
      tone="danger"
      title={declined ? "We couldn't confirm this time" : `${title} is cancelled`}
      logoUrl={logoUrl}
      brandName={brandName}
      supportEmail={supportEmail}
      cta={rebookUrl ? { href: rebookUrl, label: 'Pick a new time' } : undefined}
      ctaHint={supportEmail ? `Questions? Reply to this email or write to ${supportEmail}.` : 'Questions? Just reply to this email.'}
      signature={{ name: hostName, detail: brandName }}
    >
      <Text style={p}>
        Hi {guestName},{' '}
        {declined
          ? `unfortunately ${hostName} can't make the time you requested. Sorry about that, we'd still love to talk.`
          : `the meeting below has been cancelled and removed from the calendar. Sorry for any inconvenience.`}
      </Text>
      <DetailCard accent={colors.danger} rows={[{ label: 'Meeting', value: title }, { label: 'Date', value: when.date }, { label: 'Time', value: when.time }]} />
    </Shell>
  )
}

export default BookingCancelled
