import * as React from 'react'
import { Text } from '@react-email/components'
import { DetailCard, p, Shell } from './Shell'
import { formatWhen } from './theme'

export interface BookingInviteProps {
  guestName: string
  hostName: string
  title: string
  startTime: Date
  endTime: Date
  timeZone: string
  acceptUrl: string
  logoUrl: string
  brandName?: string
  supportEmail?: string
  notes?: string | null
}

export function BookingInvite({ guestName, hostName, title, startTime, endTime, timeZone, acceptUrl, logoUrl, brandName = 'Igani', supportEmail, notes }: BookingInviteProps): React.ReactElement {
  const when = formatWhen(startTime, endTime, timeZone)
  return (
    <Shell
      preview={`${hostName} invited you: ${title}`}
      eyebrow="Meeting invitation"
      title={title}
      logoUrl={logoUrl}
      brandName={brandName}
      supportEmail={supportEmail}
      cta={{ href: acceptUrl, label: 'Confirm this time' }}
      ctaHint="A Google Meet link is created as soon as you confirm."
    >
      <Text style={p}>Hi {guestName}, {hostName} from {brandName} would like to meet with you.</Text>
      <DetailCard rows={[{ label: 'Date', value: when.date }, { label: 'Time', value: when.time }, { label: 'Host', value: hostName }]} />
      {notes ? <Text style={{ ...p, fontSize: 14, lineHeight: '22px' }}>{notes}</Text> : null}
    </Shell>
  )
}

export default BookingInvite
