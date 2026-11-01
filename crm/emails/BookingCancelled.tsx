import * as React from 'react'
import { MeetingCard, Shell, p } from './Shell'
import { Text } from '@react-email/components'
import { formatWhen } from './theme'

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
  const w = formatWhen(startTime, endTime, timeZone)
  const declined = kind === 'declined'
  return (
    <Shell
      preview={declined ? `We couldn't confirm ${title} on ${w.date}. Here's how to pick another time.` : `Cancelled: ${title} on ${w.date}`}
      eyebrow={declined ? 'Not confirmed' : 'Cancelled'}
      tone="danger"
      icon="✕"
      title={declined ? "We couldn't confirm this time" : 'This meeting is cancelled'}
      intro={
        declined ? (
          <>Hi {guestName}, unfortunately {hostName} can&apos;t make the time you requested. Sorry about that, we&apos;d still love to talk.</>
        ) : (
          <>Hi {guestName}, the meeting below has been cancelled and removed from the calendar. Sorry for any inconvenience.</>
        )
      }
      logoUrl={logoUrl}
      brandName={brandName}
      supportEmail={supportEmail}
      cta={rebookUrl ? { href: rebookUrl, label: 'Pick a new time' } : undefined}
      ctaHint={supportEmail ? `Questions? Reply to this email or write to ${supportEmail}.` : 'Questions? Just reply to this email.'}
      signature={{ name: hostName, detail: brandName }}
    >
      <MeetingCard month={w.month} day={w.day} weekday={w.weekday} title={title} time={w.time} tone="danger" struck />
      {!rebookUrl ? <Text style={p}>Reply to this email with a few times that work for you and we&apos;ll set something up.</Text> : null}
    </Shell>
  )
}

export default BookingCancelled
