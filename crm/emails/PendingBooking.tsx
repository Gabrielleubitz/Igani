import { Text } from '@react-email/components'
import * as React from 'react'
import { p, Shell } from './Shell'
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
      <Text style={{ ...p, color: colors.text, borderLeft: `2px solid ${colors.accent}`, paddingLeft: 16 }}>
        {when.date}
        <br />
        {when.time}
      </Text>
    </Shell>
  )
}

export default PendingBooking
