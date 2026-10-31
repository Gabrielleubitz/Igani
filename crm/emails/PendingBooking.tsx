import { Text } from '@react-email/components'
import * as React from 'react'
import { DetailCard, p, Quote, Shell } from './Shell'
import { colors, formatWhen } from './theme'

export interface PendingBookingProps {
  guestName: string
  guestEmail: string
  hostName: string
  title: string
  startTime: Date
  endTime: Date
  timeZone: string
  reviewUrl: string
  logoUrl: string
  brandName?: string
  supportEmail?: string
  notes?: string | null
}

export function PendingBooking({ guestName, guestEmail, hostName, title, startTime, endTime, timeZone, reviewUrl, logoUrl, brandName, supportEmail, notes }: PendingBookingProps): React.ReactElement {
  const when = formatWhen(startTime, endTime, timeZone)
  return (
    <Shell preview={`Approval needed: ${title} with ${guestName}`} eyebrow="Approval needed" tone="warning" title={title} logoUrl={logoUrl} brandName={brandName} supportEmail={supportEmail} cta={{ href: reviewUrl, label: 'Review & approve' }} ctaHint="The time is held for the guest until you approve or decline.">
      <Text style={p}>
        <strong style={{ color: colors.text }}>{guestName}</strong> ({guestEmail}) requested a meeting with {hostName}.
      </Text>
      <DetailCard
        rows={[
          { label: 'Guest', value: `${guestName} (${guestEmail})` },
          { label: 'Date', value: when.date },
          { label: 'Time', value: when.time },
          { label: 'Host', value: hostName },
        ]}
      />
      {notes ? <Quote>{notes}</Quote> : null}
    </Shell>
  )
}

export default PendingBooking
