import { Text } from '@react-email/components'
import * as React from 'react'
import { DetailCard, p, Shell } from './Shell'
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
}

export function PendingBooking({ guestName, guestEmail, hostName, title, startTime, endTime, timeZone, reviewUrl, logoUrl, brandName, supportEmail }: PendingBookingProps): React.ReactElement {
  const when = formatWhen(startTime, endTime, timeZone)
  return (
    <Shell preview={`Approval needed: ${title} with ${guestName}`} eyebrow="Approval needed" title={title} logoUrl={logoUrl} brandName={brandName} supportEmail={supportEmail} cta={{ href: reviewUrl, label: 'Review pending bookings' }}>
      <Text style={p}>
        <strong style={{ color: colors.text }}>{guestName}</strong> ({guestEmail}) requested a meeting with {hostName}.
      </Text>
      <DetailCard
        rows={[
          { label: 'Guest', value: `${guestName} (${guestEmail})` },
          { label: 'Date', value: when.date },
          { label: 'Time', value: when.time },
        ]}
      />
    </Shell>
  )
}

export default PendingBooking
