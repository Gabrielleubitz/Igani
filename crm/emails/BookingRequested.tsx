import { Text } from '@react-email/components'
import * as React from 'react'
import { DetailCard, p, Shell } from './Shell'
import { colors, formatWhen } from './theme'

export interface BookingRequestedProps {
  guestName: string
  hostName: string
  title: string
  startTime: Date
  endTime: Date
  timeZone: string
  logoUrl: string
  brandName?: string
  supportEmail?: string
}

/** Receipt for the guest when a booking page needs approval: "we got it, we'll confirm soon". */
export function BookingRequested({ guestName, hostName, title, startTime, endTime, timeZone, logoUrl, brandName = 'Igani', supportEmail }: BookingRequestedProps): React.ReactElement {
  const when = formatWhen(startTime, endTime, timeZone)
  return (
    <Shell
      preview={`Request received: ${title} on ${when.date}`}
      eyebrow="Request received"
      tone="warning"
      title="Thanks, your time is on hold"
      logoUrl={logoUrl}
      brandName={brandName}
      supportEmail={supportEmail}
      ctaHint="You'll get a confirmation with the Google Meet link as soon as it's approved, usually within one business day."
      signature={{ name: hostName, detail: brandName }}
    >
      <Text style={p}>Hi {guestName}, we received your request to meet with {hostName}. We're holding this time for you while we confirm.</Text>
      <DetailCard accent={colors.warning} rows={[{ label: 'Meeting', value: title }, { label: 'Date', value: when.date }, { label: 'Time', value: when.time }, { label: 'Status', value: 'Waiting for confirmation' }]} />
    </Shell>
  )
}

export default BookingRequested
