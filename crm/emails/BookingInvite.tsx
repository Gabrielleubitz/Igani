import * as React from 'react'
import { Text } from '@react-email/components'
import { DetailCard, p, Quote, Shell } from './Shell'
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
      ctaHint="One click confirms it. A Google Meet link and calendar invite are sent as soon as you do. If the time doesn't work, just reply to this email."
      signature={{ name: hostName, detail: brandName }}
    >
      <Text style={p}>Hi {guestName}, {hostName} from {brandName} would like to meet with you.</Text>
      <DetailCard rows={[{ label: 'Date', value: when.date }, { label: 'Time', value: when.time }, { label: 'Host', value: hostName }, { label: 'Where', value: 'Google Meet' }]} />
      {notes ? <Quote>{notes}</Quote> : null}
    </Shell>
  )
}

export default BookingInvite
